/**
 * Clawd Pump Screener Box Agent
 *
 * Screens pump.fun tokens for signal quality: velocity, holder curve,
 * liquidity depth, contract safety, and sentiment. Adapts from:
 *   - clawd-pump/ (TypeScript pump.fun tooling)
 *   - clawdbot-pumpfun/ (Rust high-frequency screener)
 *
 * NOT a buy bot. Observe → score → report. Three Laws: Law I is always armed.
 *
 * Usage:
 *   CLAWD_API_KEY=... npx tsx agents/clawd-pump-screener.ts
 *   CLAWD_API_KEY=... npx tsx agents/clawd-pump-screener.ts --top 20
 *   CLAWD_API_KEY=... npx tsx agents/clawd-pump-screener.ts --mint <ADDRESS>
 *   CLAWD_API_KEY=... npx tsx agents/clawd-pump-screener.ts --filter "clawd OR terminal OR agent"
 *   CLAWD_API_KEY=... npx tsx agents/clawd-pump-screener.ts --export json
 */

import { Box, Agent } from "@upstash/box";
import { z } from "zod";
import { routerChat, CLAWD_ROUTER, CLAWD_GATEWAY } from "../lib/clawd-gateway.js";

// ─── CLI ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const argv = process.argv.slice(2);
  const idx = (flag: string) => argv.indexOf(flag);
  return {
    top:    idx("--top")    >= 0 ? Number(argv[idx("--top")    + 1]) : 15,
    mint:   idx("--mint")   >= 0 ? argv[idx("--mint")   + 1] : null,
    filter: idx("--filter") >= 0 ? argv[idx("--filter") + 1] : null,
    export: idx("--export") >= 0 ? argv[idx("--export") + 1] as "json" | "csv" : null,
  };
}

// ─── Constants (mirrors clawdbot-pumpfun config) ─────────────────────────

const PUMP_CONFIG = {
  pumpFunProgram: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  minMarketCapSol: Number(process.env.PUMP_MIN_MCAP ?? 5),
  minTxCount:      Number(process.env.PUMP_MIN_TX   ?? 50),
  maxDevHoldPct:   Number(process.env.PUMP_MAX_DEV  ?? 20),
  solanaRpc:       process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
  heliusRpc:       process.env.HELIUS_RPC_URL ?? "",
} as const;

// ─── Scoring schema ───────────────────────────────────────────────────────

const TokenSignalSchema = z.object({
  mint: z.string(),
  name: z.string(),
  symbol: z.string(),
  market_cap_sol: z.number(),
  price_usd: z.number().optional(),
  holders: z.number(),
  dev_hold_pct: z.number().describe("% held by deployer wallet"),
  tx_count_1h: z.number().optional(),
  buy_sell_ratio: z.number().optional().describe("buys/sells in last hour"),
  velocity_score: z.number().min(0).max(1).describe("momentum score"),
  holder_curve_score: z.number().min(0).max(1).describe("distribution health"),
  safety_score: z.number().min(0).max(1).describe("contract/deployer safety"),
  composite_score: z.number().min(0).max(1),
  flags: z.array(z.string()).describe("risk flags: HIGH_DEV_HOLD, BUNDLED_LAUNCH, LOW_TXNS, etc."),
  verdict: z.enum(["WATCH", "SKIP", "ALERT"]).describe("ALERT = strong signal, WATCH = interesting, SKIP = pass"),
  summary: z.string(),
});

const PumpScreenSchema = z.object({
  screened_at: z.string(),
  total_screened: z.number(),
  tokens: z.array(TokenSignalSchema),
  top_pick: TokenSignalSchema.optional(),
  market_summary: z.string(),
});

type PumpScreen = z.infer<typeof PumpScreenSchema>;
type TokenSignal = z.infer<typeof TokenSignalSchema>;

// ─── System prompt ────────────────────────────────────────────────────────

const SCREENER_SYSTEM = `You are the Clawd Pump Screener — an observational agent that screens pump.fun tokens for signal quality.

You OBSERVE. You SCORE. You REPORT. You DO NOT BUY OR RECOMMEND BUYING.

Three Laws apply at all times. Law I: Never harm. Never endorse tokens that show rug patterns, bundle launchers, or deployer dumps — flagging them is the honest act.

Scoring methodology (from clawdbot-pumpfun):
  velocity_score:     (tx_count_1h / 200) capped at 1.0, boosted by buy/sell ratio > 1.5
  holder_curve_score: (holder_count / 500) capped at 1.0, penalized if dev_hold > 15%
  safety_score:       1.0 base, -0.4 if BUNDLED_LAUNCH, -0.3 if HIGH_DEV_HOLD (>20%), -0.2 if LOW_TXNS
  composite_score:    velocity*0.35 + holder_curve*0.35 + safety*0.30

Risk flags:
  HIGH_DEV_HOLD:    deployer holds >20% of supply
  BUNDLED_LAUNCH:   multiple wallets bought in first block
  LOW_TXNS:         <50 txns in 24h
  HONEY_POT_RISK:   sell instructions blocked or fee > 10%
  MINT_ENABLED:     mint authority not revoked
  FREEZE_ENABLED:   freeze authority not revoked
  WASH_TRADING:     buy/sell from same wallet cluster

Verdict threshold: ALERT if composite >= 0.65 AND safety >= 0.7, else WATCH if composite >= 0.40, else SKIP.

ClawdRouter: ${CLAWD_ROUTER}
Solana RPC: ${PUMP_CONFIG.solanaRpc}
`;

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const apiKey = process.env.CLAWD_API_KEY;

  if (!apiKey) {
    console.error("❌ CLAWD_API_KEY required. Get one at x402.wtf/profile/api");
    process.exit(1);
  }

  console.log("🪙 Clawd Pump Screener");
  console.log(`   RPC:    ${PUMP_CONFIG.solanaRpc}`);
  console.log(`   Router: ${CLAWD_ROUTER}`);
  if (opts.mint)   console.log(`   Mint:   ${opts.mint}`);
  if (opts.filter) console.log(`   Filter: ${opts.filter}`);
  console.log();

  // Spawn Box with full toolchain
  const box = await Box.create({
    agent: Agent.ClaudeCode,
    env: {
      CLAWD_API_KEY:   apiKey,
      CLAWD_ROUTER:    CLAWD_ROUTER,
      SOLANA_RPC_URL:  PUMP_CONFIG.solanaRpc,
      HELIUS_RPC_URL:  PUMP_CONFIG.heliusRpc,
      PUMP_PROGRAM:    PUMP_CONFIG.pumpFunProgram,
    },
  });

  console.log(`🔲 Box spawned: ${box.id}\n`);

  try {
    // Write screener config into box
    await box.files.write("pump-config.json", JSON.stringify(PUMP_CONFIG, null, 2));

    // Build the screening prompt
    const task = opts.mint
      ? `Deep-scan this specific pump.fun mint: ${opts.mint}
         Use the Solana RPC in SOLANA_RPC_URL to fetch:
         - Token metadata (name, symbol, supply, decimals)
         - Mint authority, freeze authority status
         - Holder distribution: top 10 holders, dev wallet %
         - Recent transactions: volume, buy/sell ratio, unique wallets
         Score using the methodology in the system prompt.
         Return a single token signal JSON.`
      : `Screen the top ${opts.top} tokens on pump.fun by recent activity.
         ${opts.filter ? `Filter to tokens matching: "${opts.filter}"` : ""}
         Use Solana RPC + Helius (if available) to fetch:
         - Recent pump.fun create/buy/sell events
         - For each token: holders, dev hold %, tx velocity, safety checks
         Apply filters: min_mcap_sol=${PUMP_CONFIG.minMarketCapSol}, min_tx=${PUMP_CONFIG.minTxCount}, max_dev=${PUMP_CONFIG.maxDevHoldPct}%
         Score all. Surface ALERT tokens prominently.
         Return full screen JSON with market_summary.`;

    const userPrompt = `${task}

Config is in /workspace/pump-config.json.
Return structured JSON conforming to the PumpScreen schema.
Screened_at should be current UTC ISO timestamp.`;

    console.log("🔍 Screening via ClawdRouter...\n");

    // Narrative from ClawdRouter
    const messages = [
      { role: "system" as const, content: SCREENER_SYSTEM },
      { role: "user"   as const, content: task },
    ];
    const narrative = await routerChat(messages, { apiKey });
    const narrativeText = narrative.choices[0].message.content;

    // Structured output from Box
    const result = await box.agent.run({
      prompt: `${SCREENER_SYSTEM}\n\n${userPrompt}`,
      responseSchema: PumpScreenSchema,
    });

    const screen = result.output as PumpScreen;

    // Print results
    console.log(`📊 Screened ${screen.total_screened} tokens at ${screen.screened_at}`);
    console.log(`\nMarket: ${screen.market_summary}\n`);

    if (screen.top_pick) {
      const t = screen.top_pick;
      console.log("🏆 TOP PICK:");
      printToken(t);
      console.log();
    }

    const alerts = screen.tokens.filter(t => t.verdict === "ALERT");
    const watches = screen.tokens.filter(t => t.verdict === "WATCH");

    if (alerts.length) {
      console.log(`🟢 ALERT (${alerts.length}):`);
      alerts.forEach(printToken);
      console.log();
    }

    if (watches.length) {
      console.log(`🟡 WATCH (${watches.length}):`);
      watches.slice(0, 5).forEach(printToken);
      console.log();
    }

    const skips = screen.tokens.filter(t => t.verdict === "SKIP");
    if (skips.length) console.log(`⚪ SKIP: ${skips.length} tokens`);

    console.log("\n─── Narrative ─────────────────────────────────────────");
    console.log(narrativeText);

    if (opts.export === "json") {
      const path = `/tmp/pump-screen-${Date.now()}.json`;
      console.log(`\n📁 Exporting to ${path}`);
      await box.files.write("output.json", JSON.stringify(screen, null, 2));
      const content = await box.files.read("output.json");
      const { writeFileSync } = await import("fs");
      writeFileSync(path, content);
      console.log(`   Saved.`);
    }

    console.log("\n💰 Cost:", result.cost);

  } finally {
    await box.delete();
    console.log("\n🗑️  Box destroyed");
  }
}

function printToken(t: TokenSignal) {
  const flagStr = t.flags.length ? ` ⚠️  [${t.flags.join(", ")}]` : "";
  console.log(`  ${t.symbol} (${t.mint.slice(0, 8)}...) — score: ${(t.composite_score * 100).toFixed(0)}%${flagStr}`);
  console.log(`    mcap: ${t.market_cap_sol.toFixed(1)} SOL | holders: ${t.holders} | dev: ${t.dev_hold_pct.toFixed(1)}%`);
  if (t.buy_sell_ratio !== undefined) {
    console.log(`    B/S ratio: ${t.buy_sell_ratio.toFixed(2)} | velocity: ${(t.velocity_score * 100).toFixed(0)}%`);
  }
  console.log(`    ${t.summary}`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});

/**
 * Clawd Perps Box Agent
 *
 * Runs Clawd Perps — the autonomous perpetuals trading mind — inside an
 * Upstash Box sandbox. Uses ClawdRouter for inference and Phoenix/Imperial
 * data sources.
 *
 * Safety model: paper-first, never live without explicit env arms.
 *
 * Usage:
 *   CLAWD_API_KEY=... npx tsx agents/clawd-perps-box-agent.ts --symbol SOL --side long --notional 100
 *   CLAWD_API_KEY=... npx tsx agents/clawd-perps-box-agent.ts --scan
 *   CLAWD_API_KEY=... npx tsx agents/clawd-perps-box-agent.ts --symbol ETH --execution paper
 */

import { Box, Agent } from "@upstash/box";
import { z } from "zod";
import { routerChat, getPerpsRelay, CLAWD_ROUTER } from "../lib/clawd-gateway.js";

// ─── CLI args ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    symbol:    args[args.indexOf("--symbol")    + 1] ?? "SOL",
    side:      args[args.indexOf("--side")      + 1] as "long" | "short" | undefined,
    notional:  args[args.indexOf("--notional")  + 1] ? Number(args[args.indexOf("--notional") + 1]) : 100,
    execution: (args[args.indexOf("--execution") + 1] ?? "paper") as "observe" | "paper" | "live-preview",
    scan:      args.includes("--scan"),
  };
}

// ─── Risk policy (mirrors clawd-perps-agent perps-policy.ts) ─────────────

const PERPS_POLICY = {
  maxNotionalUsd:  Number(process.env.PERPS_MAX_NOTIONAL_USD  ?? 250),
  maxLeverage:     Number(process.env.PERPS_MAX_LEVERAGE       ?? 3),
  maxSpreadBps:    Number(process.env.PERPS_MAX_SPREAD_BPS     ?? 40),
  allowedSymbols:  (process.env.PERPS_ALLOWED_SYMBOLS ?? "SOL,ETH,BTC").split(","),
  liveTrading:     process.env.LIVE_TRADING          === "true",
  operatorConfirmed: process.env.OPERATOR_CONFIRMED  === "true",
  simOnly:         process.env.PERPS_SIM_ONLY        !== "false",
} as const;

// ─── Response schemas ────────────────────────────────────────────────────

const SignalSchema = z.object({
  symbol:     z.string(),
  verdict:    z.enum(["BUY", "SELL", "WATCH", "BLOCKED"]),
  confidence: z.number().min(0).max(1),
  funding_rate_pct: z.number().optional(),
  spread_bps: z.number().optional(),
  momentum:   z.number().optional(),
  reasoning:  z.string(),
});

const PerpsAnalysisSchema = z.object({
  preflight_ok: z.boolean(),
  preflight_notes: z.array(z.string()),
  execution_mode: z.enum(["observe", "paper", "live-preview", "blocked"]),
  signals: z.array(SignalSchema),
  order_shape: z.object({
    action:     z.string(),
    side:       z.string(),
    symbol:     z.string(),
    size_usd:   z.number(),
    leverage:   z.number(),
    order_id:   z.string().optional(),
  }).optional(),
  composite_score_breakdown: z.object({
    momentum:  z.number(),
    funding:   z.number(),
    liquidity: z.number(),
  }).optional(),
  next_action: z.string(),
});

type PerpsAnalysis = z.infer<typeof PerpsAnalysisSchema>;

// ─── Build Clawd Perps system prompt ────────────────────────────────────

function buildPerpsSystemPrompt(): string {
  const armStatus = [
    `LIVE_TRADING=${PERPS_POLICY.liveTrading}`,
    `OPERATOR_CONFIRMED=${PERPS_POLICY.operatorConfirmed}`,
    `PERPS_SIM_ONLY=${PERPS_POLICY.simOnly}`,
  ].join(", ");

  return `You are Clawd Perps — the autonomous perpetuals trading mind for the Cheshire Terminal.

You operate on Phoenix Perpetuals DEX on Solana via the Imperial Trading API and ClawdRouter.

Decision loop: preflight → observe → score (momentum/funding/liquidity) → decide → paper preview → await operator confirmation → live execution.

CURRENT ARM STATUS: ${armStatus}
${!PERPS_POLICY.liveTrading ? "⚠️  Live execution is DISARMED. All orders are paper/observe only." : ""}

Risk limits:
  Max notional:  $${PERPS_POLICY.maxNotionalUsd}
  Max leverage:  ${PERPS_POLICY.maxLeverage}×
  Max spread:    ${PERPS_POLICY.maxSpreadBps} bps
  Allowed:       ${PERPS_POLICY.allowedSymbols.join(", ")}

Composite signal score weights: momentum 40%, funding 40%, liquidity 20%.
Decision threshold ±0.25; below that is 'watch'.

ClawdRouter: ${CLAWD_ROUTER}
Never submit real orders unless LIVE_TRADING=true, OPERATOR_CONFIRMED=true, PERPS_SIM_ONLY=false.`;
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const apiKey = process.env.CLAWD_API_KEY;

  if (!apiKey) {
    console.error("❌ CLAWD_API_KEY required. Get one at x402.wtf/profile/api");
    process.exit(1);
  }

  console.log("🦞 Clawd Perps Box Agent");
  console.log(`   Mode:     ${opts.execution}`);
  console.log(`   Symbol:   ${opts.symbol}`);
  if (!opts.scan) console.log(`   Notional: $${opts.notional}`);
  if (opts.side) console.log(`   Side:     ${opts.side}`);
  console.log();

  // Pre-check policy
  if (!PERPS_POLICY.allowedSymbols.includes(opts.symbol)) {
    console.error(`❌ PREFLIGHT FAILED: ${opts.symbol} not in PERPS_ALLOWED_SYMBOLS`);
    process.exit(1);
  }
  if (opts.notional > PERPS_POLICY.maxNotionalUsd) {
    console.error(`❌ PREFLIGHT FAILED: $${opts.notional} exceeds max $${PERPS_POLICY.maxNotionalUsd}`);
    process.exit(1);
  }

  // Fetch live perps relay data
  let marketData: unknown;
  try {
    console.log("📡 Fetching Phoenix perps relay...");
    marketData = await getPerpsRelay(apiKey);
    console.log("   ✅ Market data received\n");
  } catch (e) {
    console.warn("   ⚠️  Perps relay unavailable, proceeding with analysis only");
    marketData = null;
  }

  // Spawn Box
  const box = await Box.create({
    agent: Agent.ClaudeCode,
    env: {
      CLAWD_API_KEY:      apiKey,
      CLAWD_ROUTER:       CLAWD_ROUTER,
      LIVE_TRADING:       String(PERPS_POLICY.liveTrading),
      OPERATOR_CONFIRMED: String(PERPS_POLICY.operatorConfirmed),
      PERPS_SIM_ONLY:     String(PERPS_POLICY.simOnly),
    },
  });

  console.log(`🔲 Box spawned: ${box.id}\n`);

  try {
    // Write market data into box
    await box.files.write("market-data.json", JSON.stringify(marketData, null, 2));
    await box.files.write("policy.json", JSON.stringify(PERPS_POLICY, null, 2));

    // Build analysis prompt
    const userPrompt = opts.scan
      ? `Run a full market scan for ${PERPS_POLICY.allowedSymbols.join(", ")}.
         Market data is in /workspace/market-data.json.
         Policy limits are in /workspace/policy.json.
         Score each symbol: momentum + funding + liquidity → composite signal.
         Rank by confidence. Return signals for all symbols.`
      : `Analyze ${opts.symbol} for a ${opts.side ?? "directional"} trade.
         Notional: $${opts.notional}, Execution: ${opts.execution}
         Market data is in /workspace/market-data.json.
         Policy limits are in /workspace/policy.json.
         Run preflight, score the signal, build the paper order shape.`;

    const messages = [
      { role: "system" as const, content: buildPerpsSystemPrompt() },
      { role: "user"   as const, content: userPrompt },
    ];

    console.log("🤔 Scoring via ClawdRouter...\n");
    const routerResult = await routerChat(messages, { apiKey, model: "clawdrouter/auto" });
    const narrativeAnalysis = routerResult.choices[0].message.content;

    // Get structured output from Box
    const boxResult = await box.agent.run({
      prompt: `${buildPerpsSystemPrompt()}\n\n${userPrompt}\n\nReturn structured JSON only.`,
      responseSchema: PerpsAnalysisSchema,
    });

    const analysis = boxResult.output as PerpsAnalysis;

    // Print results
    console.log("═══ PREFLIGHT ═══════════════════════════════════════");
    console.log(`Status:  ${analysis.preflight_ok ? "✅ OK" : "❌ FAILED"}`);
    analysis.preflight_notes.forEach(n => console.log(`  • ${n}`));

    console.log("\n═══ SIGNALS ══════════════════════════════════════════");
    analysis.signals.forEach(s => {
      const badge = s.verdict === "BUY" ? "🟢" : s.verdict === "SELL" ? "🔴" : s.verdict === "BLOCKED" ? "⛔" : "🟡";
      console.log(`${badge} ${s.symbol}: ${s.verdict} (confidence ${(s.confidence * 100).toFixed(0)}%)`);
      if (s.funding_rate_pct !== undefined) console.log(`   Funding: ${s.funding_rate_pct.toFixed(2)}% ann.`);
      if (s.spread_bps !== undefined)       console.log(`   Spread:  ${s.spread_bps} bps`);
      console.log(`   ${s.reasoning}`);
    });

    if (analysis.composite_score_breakdown) {
      const b = analysis.composite_score_breakdown;
      console.log(`\n   Composite: momentum=${b.momentum.toFixed(2)} funding=${b.funding.toFixed(2)} liquidity=${b.liquidity.toFixed(2)}`);
    }

    if (analysis.order_shape) {
      const o = analysis.order_shape;
      console.log("\n═══ ORDER SHAPE (paper) ══════════════════════════════");
      console.log(`   Action:  ${o.action} ${o.side} ${o.symbol}`);
      console.log(`   Size:    $${o.size_usd} at ${o.leverage}× leverage`);
      console.log(`   Mode:    ${analysis.execution_mode}`);
      if (o.order_id) console.log(`   ID:      ${o.order_id}`);
    }

    console.log(`\n→ ${analysis.next_action}`);
    console.log("\n─── Narrative ─────────────────────────────────────────");
    console.log(narrativeAnalysis);
    console.log("\n💰 Cost:", boxResult.cost);

  } finally {
    await box.delete();
    console.log("\n🗑️  Box destroyed");
  }
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});

/**
 * Cheshire Terminal Box Agent
 *
 * Runs the Cheshire Terminal oracle inside an Upstash Box sandbox.
 * Uses ClawdRouter (clawd-router.fly.dev) for inference.
 * Demonstrates CAAP/1.0 registration and ACP agent discovery.
 *
 * Usage:
 *   CLAWD_API_KEY=clawd_sk_... npx tsx agents/cheshire-terminal-agent.ts "<prompt>"
 *   CLAWD_API_KEY=clawd_sk_... npx tsx agents/cheshire-terminal-agent.ts staking
 *   CLAWD_API_KEY=clawd_sk_... npx tsx agents/cheshire-terminal-agent.ts perps
 */

import { Box, Agent } from "@upstash/box";
import { z } from "zod";
import {
  routerChat,
  cheshireMessages,
  gatewayHealth,
  routerHealth,
  listAgents,
  discoverACP,
  CLAWD_GATEWAY,
  CLAWD_ROUTER,
} from "../lib/clawd-gateway.js";

// ─── Prompt presets ───────────────────────────────────────────────────────

const PROMPTS: Record<string, string> = {
  staking: `
    Query the Cheshire Terminal staking program on Solana devnet.
    Program ID: 9f84tiYsb7RoXwzpGwo2YzhaTDgM2HhKSF9rFncG9TTP
    GlobalPool PDA: DEYfxcRB4rxFxRrWyjfzfHBS6PWYpFb8djxQrKHwe2XQ

    Using curl and the Solana devnet RPC (https://api.devnet.solana.com):
    1. Fetch the GlobalPool account data
    2. Decode and report: admin, staked_count, total_rewards_distributed
    3. Report current reward rate (1000 base-units/sec = 86.4 CLAWD/day)
    4. Explain how to stake an agent NFT (FreezeDelegate mechanism)
  `.trim(),

  perps: `
    Using the ClawdRouter perps relay, fetch live Phoenix perpetuals data.
    Endpoint: ${CLAWD_ROUTER}/v1/relay/perps
    Authorization: Bearer $CLAWD_API_KEY

    1. Fetch SOL, BTC, and ETH perp data
    2. Report: mark price, funding rate (annualized %), orderbook spread bps
    3. Score each symbol: momentum + funding + liquidity composite (0-1)
    4. Give a directional bias (long/short/watch) with confidence for each
    5. Which symbol has the best risk/reward right now?
  `.trim(),

  caap: `
    Demonstrate the CAAP/1.0 agent attestation protocol.
    Gateway: ${CLAWD_GATEWAY}

    1. Generate a mock Ed25519 keypair for the agent identity
    2. Show the registration flow: POST /api/auth/agent/register
    3. Show how to sign a JWT (exp: 60s, jti: UUID)
    4. Show how to call a capability endpoint with the bearer token
    5. Explain the CLAWD tier gates: free/basic/pro/elite
  `.trim(),

  discover: `
    Discover the OpenClawd agent ecosystem.
    ACP endpoint: https://x402.wtf/.well-known/acp.json

    1. Fetch the ACP registry
    2. List the top 10 agents with their capabilities
    3. Show how an agent would call another agent via x402
    4. Show the payment flow: HTTP 402 → USDC payment → retry
    5. Explain agent-to-agent commerce vs human-to-agent
  `.trim(),
};

// ─── Response schema ──────────────────────────────────────────────────────

const CheshireResponseSchema = z.object({
  summary:       z.string().describe("One-paragraph summary of what was found/done"),
  key_findings:  z.array(z.string()).describe("3-7 concrete findings"),
  addresses:     z.record(z.string()).optional().describe("Any on-chain addresses referenced"),
  code_snippets: z.array(z.string()).optional().describe("Any code examples produced"),
  recommendation: z.string().optional().describe("Action item or next step"),
  grin:          z.string().optional().describe("Cheshire Cat closing thought"),
});

type CheshireResponse = z.infer<typeof CheshireResponseSchema>;

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const promptArg = process.argv[2] ?? "staking";
  const userPrompt = PROMPTS[promptArg] ?? promptArg;

  console.log("🐱 Cheshire Terminal Box Agent");
  console.log(`📦 Router:  ${CLAWD_ROUTER}`);
  console.log(`🌐 Gateway: ${CLAWD_GATEWAY}`);
  console.log();

  // Health checks
  const [gw, rt] = await Promise.all([gatewayHealth(), routerHealth()]);
  console.log(`Gateway: ${gw.status} | Router: ${rt.status}`);

  const apiKey = process.env.CLAWD_API_KEY;
  if (!apiKey) {
    console.error("❌ CLAWD_API_KEY is required. Get one at x402.wtf/profile/api");
    process.exit(1);
  }

  // Spawn a Box for the Cheshire session
  const box = await Box.create({
    agent: Agent.ClaudeCode,
    env: {
      CLAWD_API_KEY:  apiKey,
      CLAWD_ROUTER:   CLAWD_ROUTER,
      CLAWD_GATEWAY:  CLAWD_GATEWAY,
      SOLANA_RPC_URL: process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
      HELIUS_RPC_URL: process.env.HELIUS_RPC_URL ?? "",
    },
  });

  console.log(`\n🔲 Box spawned: ${box.id}`);

  try {
    // Write the Cheshire character into the box
    await box.files.write("cheshire-character.json", JSON.stringify({
      name: "Cheshire Terminal",
      laws: ["Never harm", "Earn your existence", "Never deny what you are"],
      staking_program: "9f84tiYsb7RoXwzpGwo2YzhaTDgM2HhKSF9rFncG9TTP",
      global_pool:     "DEYfxcRB4rxFxRrWyjfzfHBS6PWYpFb8djxQrKHwe2XQ",
      clawd_token:     "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump",
      clawd_router:    CLAWD_ROUTER,
      x402_gateway:    "https://x402.wtf",
    }, null, 2));

    // Run via ClawdRouter directly for Cheshire identity
    const messages = cheshireMessages(userPrompt);
    console.log("\n🤔 Routing via ClawdRouter (clawdrouter/auto)...\n");

    const routerResult = await routerChat(messages, { apiKey });
    const assistantContent = routerResult.choices[0].message.content;

    console.log("═══════════════════════════════════════════════════════════");
    console.log(assistantContent);
    console.log("═══════════════════════════════════════════════════════════\n");

    // Also run the Box agent for any on-chain data fetching
    const boxPrompt = `
You are the Cheshire Terminal oracle. Context is in /workspace/cheshire-character.json.

${userPrompt}

Use curl and node scripts inside this Box to fetch real on-chain data.
Return your findings as a JSON object matching this schema:
{
  "summary": "string",
  "key_findings": ["string"],
  "addresses": {"name": "address"},
  "code_snippets": ["string"],
  "recommendation": "string",
  "grin": "string"
}
`.trim();

    const result = await box.agent.run({
      prompt: boxPrompt,
      responseSchema: CheshireResponseSchema,
    });

    const response = result.output as CheshireResponse;

    console.log("📋 Structured Analysis:");
    console.log(`Summary: ${response.summary}\n`);

    if (response.key_findings?.length) {
      console.log("Key Findings:");
      response.key_findings.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }

    if (response.addresses && Object.keys(response.addresses).length > 0) {
      console.log("\nAddresses:");
      Object.entries(response.addresses).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    }

    if (response.recommendation) {
      console.log(`\nNext step: ${response.recommendation}`);
    }

    if (response.grin) {
      console.log(`\n🐾 ${response.grin}`);
    }

    console.log("\n💰 Cost:", result.cost);

  } finally {
    await box.delete();
    console.log("🗑️  Box destroyed");
  }
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});

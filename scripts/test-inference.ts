/**
 * Quick smoke test — verify the inference backend is working.
 * Run: npx tsx scripts/test-inference.ts
 * Or:  node --env-file=.env --import tsx/esm scripts/test-inference.ts
 */

import { routerChat, resolveInferenceBackend, cheshireMessages } from "../lib/clawd-gateway.js";

const { backend, url, model, key } = resolveInferenceBackend({});

console.log("── Inference Backend ──────────────────────────────────────────");
console.log(`  Backend : ${backend}`);
console.log(`  URL     : ${url}`);
console.log(`  Model   : ${model}`);
console.log(`  Key     : ${key.slice(0, 12)}...`);
console.log("");

try {
  console.log("── Sending test chat ──────────────────────────────────────────");
  const resp = await routerChat(cheshireMessages("Say hello in exactly 5 words."), {
    maxTokens: 30,
    temperature: 0.3,
  });

  const content = resp.choices[0]?.message?.content ?? "(empty)";
  console.log(`  Model   : ${resp.model}`);
  console.log(`  Tokens  : ${resp.usage?.total_tokens ?? "?"}`);
  console.log(`  Reply   : ${content}`);
  console.log("");
  console.log("  ✓ Inference is working!");
} catch (err) {
  console.error("  ✗ Inference failed:", (err as Error).message);
  console.log("");
  console.log("  Troubleshooting:");
  if (backend === "local") {
    console.log("    • Start the local router: cd ../clawdrouter && npm run dev");
    console.log("    • Then re-run this script");
  } else if (backend === "openrouter") {
    console.log("    • Check OPENROUTER_API_KEY in box/.env");
  } else {
    console.log("    • Set OPENROUTER_API_KEY in box/.env (free models available)");
    console.log("    • Or run local router: cd ../clawdrouter && npm run dev");
  }
  process.exit(1);
}

// Bonus: check perps relay
try {
  console.log("── Checking Solana RPC / Perps relay ─────────────────────────");
  const { getPerpsRelay } = await import("../lib/clawd-gateway.js");
  const perps = (await getPerpsRelay()) as Record<string, unknown>;
  console.log("  ✓ Perps relay reachable:", JSON.stringify(perps).slice(0, 120));
} catch {
  console.log("  ~ Perps relay not available (clawdrouter not running locally)");
}

console.log("");
console.log("── Done ───────────────────────────────────────────────────────");

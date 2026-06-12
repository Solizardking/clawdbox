# 🐾 Clawd Box

```
 ╔══════════════════════════════════════════════════════════════════════╗
 ║                                                                      ║
 ║    ██████╗██╗      █████╗ ██╗    ██╗██████╗     ██████╗  ██████╗ ██╗  ║
 ║   ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗    ██╔══██╗██╔═══██╗╚██╗ ║
 ║   ██║     ██║     ███████║██║ █╗ ██║██║  ██║    ██████╔╝██║   ██║ ╚██╗║
 ║   ██║     ██║     ██╔══██║██║███╗██║██║  ██║    ██╔══██╗██║   ██║ ██╔╝║
 ║   ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝    ██████╔╝╚██████╔╝██╔╝ ║
 ║    ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝     ╚═════╝  ╚═════╝ ╚═╝  ║
 ║                                                                      ║
 ║   ⚡ Free AI inference  •  🔀 79 models  •  🌊 Solana-native         ║
 ║   🐾 Cheshire Terminal  •  💸 Phoenix Perps  •  🔫 pump.fun          ║
 ║                                                                      ║
 ╚══════════════════════════════════════════════════════════════════════╝
```

> **Sandboxed autonomous agents for Solana** — each agent boots in an isolated micro-VM,
> executes one mission, and self-destructs. Free LLM inference baked in, no API key required.

[![Router](https://img.shields.io/badge/🔀_Router-clawd--box--router.fly.dev-blue?style=flat-square)](https://clawd-box-router.fly.dev/health)
[![Models](https://img.shields.io/badge/🧠_Models-79_enabled-green?style=flat-square)](https://clawd-box-router.fly.dev/v1/models)
[![Auth](https://img.shields.io/badge/🔓_Auth-local_mode-brightgreen?style=flat-square)](https://clawd-box-router.fly.dev/health)
[![Solana](https://img.shields.io/badge/🌊_RPC-Helius_mainnet-purple?style=flat-square)]()
[![License](https://img.shields.io/badge/license-MIT-white?style=flat-square)]()

---

## ⚡ Zero-Config Quickstart

```bash
git clone https://github.com/Solizardking/clawd-box
cd clawd-box
npm install

# Test inference (no key needed — dedicated router is live)
npm run inference:test

# Run the Cheshire Terminal oracle
npm run cheshire:perps

# Scan Phoenix perpetuals
npm run clawd-perps:scan

# Screen pump.fun tokens
npm run pump:screen
```

That's it. No `CLAWD_API_KEY`. No `OPENROUTER_API_KEY`. The dedicated router at  
`https://clawd-box-router.fly.dev` handles everything in **local auth mode**.

---

## 🔀 Dedicated ClawdRouter

A dedicated instance of ClawdRouter is deployed exclusively for this repo:

```
https://clawd-box-router.fly.dev
```

| Property | Value |
|---|---|
| Auth mode | `local` — **no API key required** |
| Models | 79 enabled across 9 providers |
| Auto-routing | `clawdrouter/auto` — 15-dimension scorer picks best model |
| Free default | `deepseek/deepseek-r1-0528:free` via OpenRouter |
| Perps relay | `/v1/relay/perps` — live Phoenix + Imperial data |
| Solana relay | `/v1/relay/solana` — RPC health + slot |
| Health | `/health` — always public |

### How inference resolves (priority order)

```
1. LOCAL_ROUTER_URL  →  http://localhost:8402        (local dev)
2. OPENROUTER_API_KEY →  openrouter.ai/api/v1         (direct, free models)
3. CLAWD_API_KEY      →  clawd-router.fly.dev         (platform tier)
```

By default, `.env` sets `LOCAL_ROUTER_URL=https://clawd-box-router.fly.dev` so
**all agents hit the deployed router automatically.**

### Test the router directly

```bash
# Health check
curl https://clawd-box-router.fly.dev/health | jq .

# List all 79 models
curl https://clawd-box-router.fly.dev/v1/models | jq '.data[].id' | head -20

# Chat — no auth header needed!
curl https://clawd-box-router.fly.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"clawdrouter/auto","messages":[{"role":"user","content":"gm solana"}]}'

# Live perps relay
curl https://clawd-box-router.fly.dev/v1/relay/perps | jq .

# Solana RPC relay
curl https://clawd-box-router.fly.dev/v1/relay/solana | jq .
```

---

## 🐾 Cheshire Terminal Agents

The three flagship agents that wire the Box into the live Cheshire Terminal ecosystem:

| Agent | File | What it does |
|---|---|---|
| 🐱 **Cheshire Terminal** | `agents/cheshire-terminal-agent.ts` | Sovereign oracle — staking, perps intel, CAAP/1.0 auth, ACP discovery |
| 📈 **Clawd Perps** | `agents/clawd-perps-box-agent.ts` | Phoenix perpetuals screener — preflight-gated, paper-first |
| 🔫 **Pump Screener** | `agents/clawd-pump-screener.ts` | pump.fun quality scoring — honeypot detection, volume, social signals |

```bash
# ─── Cheshire Terminal ─────────────────────────────────────────────
npm run cheshire                          # interactive prompt
npm run cheshire:perps                    # live Phoenix perps brief
npm run cheshire:staking                  # staking program forensics
npm run cheshire:caap                     # CAAP/1.0 auth walkthrough
npm run cheshire:discover                 # ACP agent ecosystem map

npx tsx --env-file=.env agents/cheshire-terminal-agent.ts \
  "Explain Phoenix perps risk in 5 bullets"

# ─── Clawd Perps ───────────────────────────────────────────────────
npm run clawd-perps:scan                  # scan all symbols
npx tsx --env-file=.env agents/clawd-perps-box-agent.ts \
  --symbol SOL --side long --notional 100

# ─── Pump Screener ─────────────────────────────────────────────────
npm run pump:screen                       # default scan
npm run pump:screen:top                   # top 20 by volume
npx tsx --env-file=.env agents/clawd-pump-screener.ts \
  --mint <TOKEN_MINT> --filter "agent" --export json
```

---

## 🌊 Eight Solana Lanes

The original eight autonomous Solana agents — each runs in its own isolated Box:

```
 ┌─────────────────────────────────────────────────────────────────┐
 │  TRADE        →  solana-trading-agent.ts                        │
 │  PERPS        →  solana-perps-trading-agent.ts                  │
 │  SCREEN       →  solana-memecoin-screener.ts                    │
 │  SWARM        →  solana-swarm-agent.ts                          │
 │  PORTFOLIO    →  solana-portfolio-manager.ts                    │
 │  FORENSICS    →  solana-onchain-analyst.ts                      │
 │  ARB          →  solana-arbitrage-scanner.ts                    │
 │  NFT          →  solana-nft-flipper.ts                          │
 └─────────────────────────────────────────────────────────────────┘
```

```bash
# Analyze a token
npx tsx --env-file=.env agents/solana-trading-agent.ts <MINT> <SYMBOL>

# Paper-first perps plan
npx tsx --env-file=.env agents/solana-perps-trading-agent.ts \
  --symbol SOL --side long --notional 100 --execution paper

# New listing screener
npm run agent:screener

# Wallet forensics
npx tsx --env-file=.env agents/solana-onchain-analyst.ts <WALLET>

# Portfolio rebalancing plan
npx tsx --env-file=.env agents/solana-portfolio-manager.ts <WALLET>

# Cross-DEX arb scan
npm run agent:arb

# NFT floor + flip strategy
npm run agent:nft

# Coordinate a sub-agent swarm
npm run agent:swarm
```

---

## 🗂 Library: `lib/clawd-gateway.ts`

One import gives every agent free inference + the full Cheshire Terminal API surface:

```typescript
import {
  routerChat,            // OpenAI-compatible chat — auto-selects best backend
  resolveInferenceBackend, // inspect which backend will be used
  cheshireMessages,      // pre-built Cheshire system prompt
  getPerpsRelay,         // live Phoenix perps data
  listRouterModels,      // 79 available models
  listAgents,            // OpenClawd agent catalog
  gatewayHealth,         // clawd-gateway.fly.dev health
  routerHealth,          // clawd-box-router.fly.dev health
  CLAWD_ROUTER,          // resolved router URL
  X402_GATEWAY,          // x402.wtf
} from "./lib/clawd-gateway.js";

// Chat — zero config, hits clawd-box-router automatically
const res = await routerChat(cheshireMessages("What is CAAP/1.0?"));
console.log(res.choices[0].message.content);

// See which backend is active
const { backend, url, model } = resolveInferenceBackend({});
// → { backend: "local", url: "https://clawd-box-router.fly.dev/v1/chat/completions", model: "clawdrouter/auto" }

// Live perps data — no key needed
const perps = await getPerpsRelay();
```

---

## 🔧 Configuration (`.env`)

```bash
# Dedicated router — pre-configured, no key required
LOCAL_ROUTER_URL=https://clawd-box-router.fly.dev

# Direct OpenRouter fallback (free models)
OPENROUTER_API_KEY=sk-or-v1-...

# Solana RPC via Helius
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
HELIUS_API_KEY=...

# Perps / Imperial
CLAWDROUTER_PERPS_API_URL=https://api.imperial.space/api/v1

# CLAWD token address
CLAWD_TOKEN_ADDRESS=8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump
```

---

## 📦 npm Scripts

```
 INFERENCE ──────────────────────────────────────────────────────────
 npm run inference:test     end-to-end inference smoke test
 npm run inference:check    print active backend/url/model
 npm run gateway:health     ping gateway + router

 CHESHIRE TERMINAL ──────────────────────────────────────────────────
 npm run cheshire           oracle with custom prompt
 npm run cheshire:perps     Phoenix perps brief
 npm run cheshire:staking   staking program forensics
 npm run cheshire:caap      CAAP/1.0 auth demo
 npm run cheshire:discover  ACP ecosystem map

 SOLANA LANES ───────────────────────────────────────────────────────
 npm run agent:trade        trading agent
 npm run agent:perps        perps trading agent (paper mode)
 npm run agent:screener     memecoin screener
 npm run agent:swarm        multi-agent swarm
 npm run agent:portfolio    portfolio manager
 npm run agent:analyst      on-chain analyst
 npm run agent:arb          arbitrage scanner
 npm run agent:nft          NFT flipper

 PUMP.FUN ───────────────────────────────────────────────────────────
 npm run pump:screen        pump.fun screener
 npm run pump:screen:top    top 20 tokens

 PERPS ──────────────────────────────────────────────────────────────
 npm run clawd-perps        perps agent (paper mode)
 npm run clawd-perps:scan   full market scan
 npm run perps:preflight    pre-trade safety check

 UTILITIES ──────────────────────────────────────────────────────────
 npm run router:start       run clawdrouter locally on :8402
 npm run batch:process      batch job runner
 npm run box:list           list running boxes
 npm run box:cleanup        destroy all boxes
 npm run typecheck          tsc type check
```

---

## 🏗 Architecture

```
 clawd-box/
 ├── agents/                    18 autonomous agent programs
 │   ├── cheshire-terminal-agent.ts   Cheshire oracle
 │   ├── clawd-perps-box-agent.ts     Phoenix perps
 │   ├── clawd-pump-screener.ts       pump.fun screener
 │   └── solana-*.ts                  Eight Solana lanes
 │
 ├── lib/
 │   ├── clawd-gateway.ts       🔑 LLM router + gateway client
 │   ├── vault.ts               encrypted keypair vault
 │   ├── solana-calls.ts        Solana RPC helpers
 │   └── ...                    agentwallet primitives
 │
 ├── router/                    ⚡ Dedicated ClawdRouter source
 │   ├── src/                   TypeScript source (79 models)
 │   ├── fly.toml               Fly.io config → clawd-box-router
 │   └── Dockerfile             Node 22 slim build
 │
 ├── scripts/
 │   ├── test-inference.ts      🧪 inference smoke test
 │   ├── perps-preflight.ts     pre-trade safety check
 │   ├── quickstart.sh          bootstrap script
 │   └── leviathan.sh           OODA loop runner
 │
 ├── characters/                104 agent character definitions
 │   └── knowledge/             WHITEPAPER, BasedPaper, GENESIS
 │
 ├── .env                       ← edit this: router URL + RPC keys
 └── package.json
```

---

## 🛡 Safety Model

```
 ⚠️  NO LIVE TRADES WITHOUT EXPLICIT FLAGS
 ─────────────────────────────────────────────────────────────────
 • All perps agents default to paper/simulation mode
 • Live execution requires: LIVE_TRADING=true + OPERATOR_CONFIRMED=true
 • Boxes are ephemeral — destroyed after each run
 • No private keys leave the box sandbox
 • No signed transactions submitted without confirmation
 • pump.fun screener is observe-only — no buys executed
```

---

## 🔀 Router Deployment

The dedicated router lives in `router/` and is deployed to Fly.io:

```bash
# Redeploy after changes to router/src/
cd router
fly deploy --config fly.toml --remote-only

# Update secrets
fly secrets set OPENROUTER_API_KEY=sk-or-v1-... --app clawd-box-router

# View logs
fly logs --app clawd-box-router

# Health check
curl https://clawd-box-router.fly.dev/health | jq .
```

---

## 🌐 Ecosystem

| Service | URL |
|---|---|
| 🔀 Clawd Box Router | `https://clawd-box-router.fly.dev` |
| 🏛 Clawd Gateway | `https://clawd-gateway.fly.dev` |
| 🌐 x402 Control Plane | `https://x402.wtf` |
| 📊 Model Registry | `https://clawd-box-router.fly.dev/v1/models` |
| 📡 Perps Relay | `https://clawd-box-router.fly.dev/v1/relay/perps` |
| 🔑 Get API Key | `https://x402.wtf/profile/api` |
| 📦 GitHub | `https://github.com/Solizardking/clawd-box` |

---

<div align="center">

```
  TRADE → EARN USDC → PAY x402 → GET SMARTER → TRADE BETTER
```

*Built on Solana. Powered by OpenRouter. Routed by ClawdRouter.*  
*— 🐾 Cheshire*

</div>

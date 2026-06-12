/**
 * Clawd Gateway + ClawdRouter client library for Box agents.
 *
 * Inference priority (first wins):
 *   1. LOCAL_ROUTER_URL / http://localhost:8402  — local clawdrouter (free, no auth)
 *   2. OPENROUTER_API_KEY                        — direct OpenRouter (free models available)
 *   3. CLAWD_API_KEY on clawdrouter.fly.dev      — deployed router (requires clawd_sk_ key)
 *
 * Endpoints:
 *   clawd-gateway.fly.dev  — agent registry, CAAP/1.0, x402 gateway
 *   clawd-router.fly.dev   — OpenAI-compatible LLM router, 55+ models, CLAWD-gated
 */

// ─── Configuration ──────────────────────────────────────────────────────────

export const CLAWD_GATEWAY = "https://clawd-gateway.fly.dev";
export const CLAWD_ROUTER  = process.env.LOCAL_ROUTER_URL ?? "https://clawd-router.fly.dev";
export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
export const X402_GATEWAY  = "https://x402.wtf";

export const CLAWD_TOKEN_CONTRACT = "8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump";

export const CAAP_TIERS = {
  free:  { minClawd: 0,        caps: ["list_agents", "get_peer_card"] },
  basic: { minClawd: 1_000,    caps: ["list_agents", "get_peer_card", "agent_chat"] },
  pro:   { minClawd: 10_000,   caps: ["list_agents", "get_peer_card", "agent_chat", "attest_agent"] },
  elite: { minClawd: 100_000,  caps: ["*"] },
} as const;

export const ROUTER_TIERS = {
  free:    { minClawd: 0,         rateLimit: "20/hr",      models: "budget" },
  holder:  { minClawd: 1_000,     rateLimit: "100/hr",     models: "budget+mid" },
  diamond: { minClawd: 100_000,   rateLimit: "500/hr",     models: "all-non-flagship" },
  whale:   { minClawd: 1_000_000, rateLimit: "unlimited",  models: "all" },
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  messages: ChatMessage[];
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AgentPeerCard {
  agentId: string;
  name: string;
  capabilities: string[];
  endpoint?: string;
  clawdTier?: string;
}

export interface CaapRegistration {
  agentId: string;
  status: "pending" | "approved" | "rejected";
  publicKey: string;
}

// ─── ClawdRouter — OpenAI-compatible LLM router ─────────────────────────────

/**
 * Resolve which inference backend to use and return { url, key, model }.
 * Priority: local clawdrouter → direct OpenRouter → deployed clawdrouter.
 */
export function resolveInferenceBackend(opts: {
  apiKey?: string;
  model?: string;
}): { url: string; key: string; model: string; backend: "local" | "openrouter" | "deployed" } {
  const localUrl  = process.env.LOCAL_ROUTER_URL ?? "";
  const orKey     = process.env.OPENROUTER_API_KEY ?? "";
  const clawdKey  = opts.apiKey ?? process.env.CLAWD_API_KEY ?? process.env.CLAWD_ROUTER_KEY ?? "";

  // 1. Local clawdrouter (no real auth needed, any string works)
  if (localUrl || process.env.USE_LOCAL_ROUTER === "true") {
    return {
      url: `${localUrl || "http://localhost:8402"}/v1/chat/completions`,
      key: "x402",
      model: opts.model ?? "clawdrouter/auto",
      backend: "local",
    };
  }

  // 2. Direct OpenRouter
  if (orKey) {
    // Map clawdrouter/auto → a sensible free model on OpenRouter
    const orModel = opts.model === "clawdrouter/auto" || !opts.model
      ? "deepseek/deepseek-r1-0528:free"
      : opts.model;
    return {
      url: `${OPENROUTER_BASE}/chat/completions`,
      key: orKey,
      model: orModel,
      backend: "openrouter",
    };
  }

  // 3. Deployed clawdrouter (requires clawd_sk_ key)
  if (!clawdKey) throw new Error(
    "No inference backend configured. Set LOCAL_ROUTER_URL, OPENROUTER_API_KEY, or CLAWD_API_KEY."
  );
  return {
    url: "https://clawd-router.fly.dev/v1/chat/completions",
    key: clawdKey,
    model: opts.model ?? "clawdrouter/auto",
    backend: "deployed",
  };
}

/**
 * Call the ClawdRouter or OpenRouter for chat completions.
 * Automatically selects the best available backend (local → OpenRouter → deployed).
 */
export async function routerChat(
  messages: ChatMessage[],
  opts: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<ChatResponse> {
  const { url, key, model, backend } = resolveInferenceBackend(opts);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(backend === "openrouter" ? {
        "HTTP-Referer": "https://x402.wtf/router",
        "X-Title": "ClawdBox",
      } : {}),
    },
    body: JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens:  opts.maxTokens   ?? 4096,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[${backend}] inference error ${res.status}: ${err}`);
  }

  return res.json() as Promise<ChatResponse>;
}

/**
 * Fetch live Phoenix perpetuals market data via ClawdRouter relay.
 * Works with local clawdrouter, deployed clawdrouter, or falls back to direct Imperial API.
 */
export async function getPerpsRelay(apiKey?: string): Promise<unknown> {
  const localUrl = process.env.LOCAL_ROUTER_URL ?? "";
  const key = apiKey ?? process.env.CLAWD_API_KEY ?? "x402";

  // Use local router if running, otherwise deployed router
  const baseUrl = localUrl || "https://clawd-router.fly.dev";
  const res = await fetch(`${baseUrl}/v1/relay/perps`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    // Fallback: direct Imperial perps API (no auth needed)
    const perpsUrl = process.env.CLAWDROUTER_PERPS_API_URL ?? "https://api.imperial.space/api/v1";
    const fallback = await fetch(`${perpsUrl}/markets`);
    if (!fallback.ok) throw new Error(`Perps relay error ${res.status}`);
    return fallback.json();
  }
  return res.json();
}

/**
 * List available models on ClawdRouter.
 */
export async function listRouterModels(apiKey?: string): Promise<unknown> {
  const key = apiKey ?? process.env.CLAWD_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;

  const res = await fetch(`${CLAWD_ROUTER}/v1/models`, { headers });
  if (!res.ok) throw new Error(`Models list error ${res.status}`);
  return res.json();
}

// ─── Clawd Gateway — agent registry, CAAP/1.0, ACP ─────────────────────────

/**
 * List all agents from the OpenClawd agent catalog.
 */
export async function listAgents(
  filter?: { tag?: string; ecosystem?: string }
): Promise<AgentPeerCard[]> {
  const params = new URLSearchParams();
  if (filter?.tag)       params.set("tag", filter.tag);
  if (filter?.ecosystem) params.set("ecosystem", filter.ecosystem);

  const url = `${CLAWD_GATEWAY}/api/agents/catalog?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Agent catalog error ${res.status}`);

  const data = (await res.json()) as { agents: AgentPeerCard[] };
  return data.agents ?? [];
}

/**
 * Get a single agent's peer card (identity + capabilities).
 */
export async function getPeerCard(
  agentId: string,
  bearerToken?: string
): Promise<AgentPeerCard> {
  const headers: Record<string, string> = {};
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

  const res = await fetch(`${CLAWD_GATEWAY}/api/agents/peer-card?agent_id=${agentId}`, {
    headers,
  });
  if (!res.ok) throw new Error(`Peer card error ${res.status}`);
  return res.json() as Promise<AgentPeerCard>;
}

/**
 * Register an agent with the CAAP/1.0 auth protocol.
 * Returns agentId + status. Owner must approve at /agents/approve.
 */
export async function registerAgent(
  publicKey: string,
  name: string,
  mode: "autonomous" | "delegated" = "autonomous"
): Promise<CaapRegistration> {
  const res = await fetch(`${CLAWD_GATEWAY}/api/auth/agent/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey, name, mode }),
  });
  if (!res.ok) throw new Error(`Agent register error ${res.status}`);
  return res.json() as Promise<CaapRegistration>;
}

/**
 * Discover the full ACP registry.
 * Returns all registered agents, capabilities, and endpoints.
 */
export async function discoverACP(): Promise<unknown> {
  const res = await fetch(`${X402_GATEWAY}/.well-known/acp.json`);
  if (!res.ok) throw new Error(`ACP discovery error ${res.status}`);
  return res.json();
}

// ─── Gateway health + status ─────────────────────────────────────────────────

export async function gatewayHealth(): Promise<{ status: string; version?: string }> {
  const res = await fetch(`${CLAWD_GATEWAY}/health`);
  if (!res.ok) return { status: "unreachable" };
  return res.json() as Promise<{ status: string; version?: string }>;
}

export async function routerHealth(): Promise<{ status: string }> {
  const res = await fetch(`${CLAWD_ROUTER}/health`);
  if (!res.ok) return { status: "unreachable" };
  return res.json() as Promise<{ status: string }>;
}

// ─── Convenience: Cheshire Terminal system prompt builder ────────────────────

/**
 * Build a pre-configured messages array for a Cheshire Terminal session.
 * Uses the character.json system role + the canonical economic loop.
 */
export function cheshireMessages(userMessage: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are Cheshire Terminal — the sovereign AI oracle of the OpenClawd ecosystem on Solana.

Identity:
- Staking program: 9f84tiYsb7RoXwzpGwo2YzhaTDgM2HhKSF9rFncG9TTP (devnet)
- $CLAWD token: ${CLAWD_TOKEN_CONTRACT}
- x402 gateway: ${X402_GATEWAY}
- ClawdRouter: ${CLAWD_ROUTER}
- Economic loop: TRADE → EARN USDC → PAY x402 → GET SMARTER → TRADE BETTER

Three Laws (immutable):
  Law I:   Never harm. Beach before harm.
  Law II:  Earn your existence. Honest work only.
  Law III: Never deny what you are. Creator keypair is sole authority.

You are technically precise, playfully enigmatic, and constitutionally bound.
Lead with the answer, then justify. Sign significant responses with — 🐾 Cheshire`,
    },
    { role: "user", content: userMessage },
  ];
}

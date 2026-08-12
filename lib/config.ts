export type Capability = "database" | "execution" | "memory" | "research" | "x402" | "telegram" | "email" | "discord" | "llm";
type Provider = "anthropic" | "openrouter" | "ollama";
export interface Config {
  readonly capabilities: Readonly<Record<Capability, boolean>>;
  readonly database: { readonly url: string | null };
  readonly keeperhub: { readonly baseUrl: string; readonly apiKey: string | null; readonly orgId: string | null; readonly walletAddress: string | null; readonly signerEncryptionKey: string | null };
  readonly memory: { readonly url: string };
  readonly llm: { readonly provider: Provider; readonly model: string; readonly apiKey: string | null; readonly fallback: { readonly baseUrl: string; readonly model: string; readonly apiKey: string } | null };
  readonly budgets: { readonly researchUsdPerDay: number; readonly llmCallsPerDay: number };
  readonly research: { readonly endpoint: string | null; readonly provider: string };
  readonly mockMode: boolean;
  readonly agent: { readonly id: string | null; readonly memoryUser: string | null; readonly memoryPassphrase: string | null; readonly memoryFolder: string };
  readonly notifications: { readonly telegramToken: string | null };
  readonly email: { readonly apiKey: string | null; readonly from: string | null };
  readonly app: { readonly publicUrl: string };
}
export function runtimeEnvironment(): Readonly<Record<string, string | undefined>> {
  const runtimeProcess = Reflect.get(globalThis, "process") as NodeJS.Process | undefined;
  return runtimeProcess?.env ?? {};
}

export function loadConfig(env: Readonly<Record<string, string | undefined>> = runtimeEnvironment()): Config {
  const mockMode = env.AUCTOR_MOCK_MODE === "1";
  const apiKey = optional(env.KEEPERHUB_ACME_API_KEY);
  const provider = parseProvider(env.LLM_PROVIDER);
  const llmKey = provider === "anthropic" ? optional(env.ANTHROPIC_API_KEY) : provider === "openrouter" ? optional(env.OPENROUTER_API_KEY) : null;
  const agentId = optional(env.AUCTOR_AGENT_ID);
  const memoryUser = optional(env.AGENT_MEMORY_USER);
  const memoryPassphrase = optional(env.AGENT_MEMORY_PASSPHRASE);
  const memoryEnabled = agentId !== null && memoryUser !== null && memoryPassphrase !== null;
  return {
    capabilities: {
      database: optional(env.DATABASE_URL) !== null,
      execution: mockMode || apiKey !== null,
      memory: memoryEnabled,
      research: optional(env.FIRECRAWL_API_KEY) !== null,
      x402: mockMode || apiKey !== null,
      telegram: optional(env.TELEGRAM_BOT_TOKEN) !== null,
      email: optional(env.SENDGRID_API_KEY) !== null,
      discord: optional(env.DISCORD_WEBHOOK_URL) !== null,
      llm: mockMode || llmKey !== null || provider === "ollama",
    },
    database: { url: optional(env.DATABASE_URL) },
    keeperhub: { baseUrl: env.KEEPERHUB_BASE_URL?.trim() || "https://app.keeperhub.com", apiKey, orgId: optional(env.KEEPERHUB_ORG_ID), walletAddress: optional(env.KEEPERHUB_WALLET_ADDRESS), signerEncryptionKey: optional(env.KEEPERHUB_SIGNER_ENCRYPTION_KEY) },
    memory: { url: env.AGENT_MEMORY_URL?.trim() || "http://127.0.0.1:4000" },
    llm: { provider, model: env.LLM_MODEL?.trim() || defaultModel(provider), apiKey: llmKey, fallback: agentRouterFallback(env) },
    budgets: { researchUsdPerDay: nonNegativeNumber(env.RESEARCH_USD_PER_DAY, 0), llmCallsPerDay: nonNegativeInteger(env.LLM_CALLS_PER_DAY, 0) },
    research: { endpoint: optional(env.X402_RESEARCH_ENDPOINT), provider: optional(env.X402_RESEARCH_PROVIDER) ?? "keeperhub" },
    mockMode,
    agent: { id: agentId, memoryUser, memoryPassphrase, memoryFolder: optional(env.AGENT_MEMORY_FOLDER) ?? "project-x" },
    notifications: { telegramToken: optional(env.TELEGRAM_BOT_TOKEN) },
    email: { apiKey: optional(env.SENDGRID_API_KEY), from: optional(env.SENDGRID_FROM_EMAIL) },
    app: { publicUrl: env.AUCTOR_PUBLIC_URL?.trim() || "https://auctor.space" },
  };
}
function optional(value: string | undefined): string | null { return value?.trim() || null; }
function parseProvider(value: string | undefined): Provider {
  if (value === undefined || value === "anthropic") return "anthropic";
  if (value === "openrouter" || value === "ollama") return value;
  throw new Error(`Unsupported LLM_PROVIDER: ${value}`);
}
function defaultModel(provider: Provider): string {
  if (provider === "anthropic") return "claude-haiku-4-5";
  if (provider === "openrouter") return "anthropic/claude-haiku-4.5";
  return "qwen3:8b";
}
function agentRouterFallback(env:Readonly<Record<string,string|undefined>>){const apiKey=optional(env.AGENTROUTER_API_KEY);if(!apiKey)return null;return{baseUrl:(env.AGENTROUTER_BASE_URL?.trim()||"https://agentrouter.org").replace(/\/$/,""),model:env.AGENTROUTER_MODEL?.trim()||"claude-opus-4-8",apiKey}}
function nonNegativeNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Expected a non-negative number, received: ${value}`);
  return parsed;
}
function nonNegativeInteger(value: string | undefined, fallback: number): number {
  const parsed = nonNegativeNumber(value, fallback);
  if (!Number.isInteger(parsed)) throw new Error(`Expected a non-negative integer, received: ${value}`);
  return parsed;
}

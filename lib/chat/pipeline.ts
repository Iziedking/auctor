export type ChatIntent =
  | { readonly kind: "greeting" }
  | { readonly kind: "help" }
  | { readonly kind: "cancel" }
  | { readonly kind: "portfolio" }
  | { readonly kind: "withdraw"; readonly amount: string; readonly destination: string; readonly chain: string }
  | { readonly kind: "preference" }
  | { readonly kind: "preference" }
  | { readonly kind: "trade"; readonly amount: string; readonly tokenIn: string; readonly tokenOut: string; readonly chain: string }
  | { readonly kind: "unknown"; readonly text: string };

export interface TradeTemplateConfig {
  readonly correlationId: string;
  readonly chains: Readonly<Record<string, string>>;
  readonly tokens: Readonly<Record<string, Address>>;
  readonly router: Address;
}

export type TradeRequestResult =
  | { readonly kind: "request"; readonly request: ExecutionRequest }
  | { readonly kind: "invalid"; readonly reason: string };

export interface ChatPipelineConfig {
  readonly mode: "mock";
  readonly chains: Readonly<Record<string, string>>;
  readonly tokens: Readonly<Record<string, Address>>;
  readonly router: Address;
  readonly simulator?: Pick<KeeperHubClient, "simulate">;
}

interface SessionMemory {
  recall(input: { readonly user: string; readonly passphrase: string; readonly query: string; readonly folder?: string }): Promise<{ readonly kind: string; readonly records?: readonly string[] }>;
  remember(input: { readonly user: string; readonly passphrase: string; readonly text: string; readonly folder?: string }): Promise<unknown>;
}

export type ChatPipelineResult =
  | { readonly kind: "message"; readonly message: string; readonly steps: readonly string[]; readonly recalledMemory: readonly string[] }
  | { readonly kind: "preview"; readonly request: ExecutionRequest; readonly trade: { readonly amount: string; readonly tokenIn: string; readonly tokenOut: string; readonly chain: string }; readonly simulation?: Simulation; readonly quote?:{readonly amountIn:string;readonly amountOut:string;readonly gasFeeUsd:string|null}; readonly approvalRequired: true; readonly checks: readonly string[]; readonly steps: readonly string[]; readonly recalledMemory: readonly string[] }
  | { readonly kind: "refused"; readonly reason: string; readonly steps: readonly string[]; readonly recalledMemory: readonly string[] };

export function classifyChat(text: string): ChatIntent {
  const normalized = text.trim().toLowerCase();
  if (/^(remember|prefer|always|never)([ :]|$)/.test(normalized)) {
    return { kind: "preference" };
  }
  if (/^(remember|prefer|always|never)/.test(normalized)) {
    return { kind: "preference" };
  }
  if (/^(hi|hey|hello|good (morning|afternoon|evening))([ ]|$)/.test(normalized)) {
    return { kind: "greeting" };
  }
  if (/(help|what can you do|how (do|can) i)/.test(normalized)) {
    return { kind: "help" };
  }
  if (/^(cancel|stop|abort)([ ]|$)/.test(normalized)) {
    return { kind: "cancel" };
  }
  if (normalized === "portfolio" || /(portfolio|balance|balances|holdings|positions)/.test(normalized)) {
    return { kind: "portfolio" };
  }
  const withdrawal=/^(?:send|withdraw) (all|[0-9]+(?:[.][0-9]+)?) eth to (my (?:connected )?wallet|0x[0-9a-f]{40})(?: on (base|ethereum|sepolia))?$/.exec(normalized);if(withdrawal?.[1]&&withdrawal[2])return{kind:"withdraw",amount:withdrawal[1],destination:withdrawal[2],chain:withdrawal[3]??"base"};
  const trade = /^(swap|trade) ([0-9]+([.][0-9]+)?) ([a-z0-9]+) to ([a-z0-9]+) on ([a-z0-9-]+)$/.exec(normalized);
  if (trade?.[2] && trade[4] && trade[5] && trade[6]) {
    return {
      kind: "trade",
      amount: trade[2],
      tokenIn: trade[4].toUpperCase(),
      tokenOut: trade[5].toUpperCase(),
      chain: trade[6],
    };
  }
  const naturalTrade = /^(swap|trade) ([0-9]+(?:[.][0-9]+)?) (base sepolia|ethereum sepolia|sepolia|base) ([a-z0-9]+) to ([a-z0-9]+)$/.exec(normalized);
  if (naturalTrade?.[2] && naturalTrade[3] && naturalTrade[4] && naturalTrade[5]) return { kind:"trade", amount:naturalTrade[2], tokenIn:naturalTrade[4].toUpperCase(), tokenOut:naturalTrade[5].toUpperCase(), chain:normalizeChain(naturalTrade[3]) };
  const tokenThenChainTrade=/^(swap|trade) ([0-9]+(?:[.][0-9]+)?) ([a-z0-9]+) on (base sepolia|ethereum sepolia|sepolia|base) to ([a-z0-9]+)$/.exec(normalized);
  if(tokenThenChainTrade?.[2]&&tokenThenChainTrade[3]&&tokenThenChainTrade[4]&&tokenThenChainTrade[5])return{kind:"trade",amount:tokenThenChainTrade[2],tokenIn:tokenThenChainTrade[3].toUpperCase(),tokenOut:tokenThenChainTrade[5].toUpperCase(),chain:normalizeChain(tokenThenChainTrade[4])};
  return { kind: "unknown", text: text.trim() };
}
function normalizeChain(value:string){if(value==="base sepolia")return"base-sepolia";if(value==="ethereum sepolia")return"sepolia";return value}

export function buildTradeRequest(intent: Extract<ChatIntent, { kind: "trade" }>, config: TradeTemplateConfig): TradeRequestResult {
  const chainId = config.chains[intent.chain];
  const tokenIn = config.tokens[intent.tokenIn];
  const tokenOut = config.tokens[intent.tokenOut];
  if (!chainId || !tokenIn || !tokenOut) return { kind: "invalid", reason: "chain or token is not configured" };
  if (!config.correlationId || !/^0x[0-9a-fA-F]{40}$/.test(config.router)) return { kind: "invalid", reason: "invalid trade template configuration" };
  return {
    kind: "request",
    request: {
      correlationId: config.correlationId,
      chainId,
      privateRouting: false,
      maxGasUsd: 0,
      action: {
        kind: "call",
        to: config.router,
        functionName: "exactInput",
        functionArgs: JSON.stringify({ tokenIn: tokenIn.toLowerCase(), tokenOut: tokenOut.toLowerCase(), amountIn: intent.amount }),
      },
    },
  };
}

export function createChatPipeline(config: ChatPipelineConfig) {
  return {
    async handle(input: { readonly text: string; readonly correlationId: string; readonly recalledMemory?: readonly string[] }): Promise<ChatPipelineResult> {
      const intent = classifyChat(input.text);
      const recalledMemory = input.recalledMemory ?? [];
      if (intent.kind === "greeting") return { kind: "message", message: "Auctor is ready.", steps: ["classified"], recalledMemory };
      if (intent.kind === "help") return { kind: "message", message: "Use: swap <amount> <token> to <token> on <chain>.", steps: ["classified"], recalledMemory };
      if (intent.kind === "cancel") return { kind: "message", message: "No transaction was submitted.", steps: ["classified", "cancelled"], recalledMemory };
      if (intent.kind === "portfolio") return { kind: "message", message: "Open Portfolio to inspect the connected agent wallet and refresh its live testnet balances.", steps: ["classified", "portfolio"], recalledMemory };
      if (intent.kind === "preference") return { kind: "message", message: "Preference noted.", steps: ["classified", "remembered"], recalledMemory };
      if (intent.kind === "withdraw") return { kind: "refused", reason: "withdrawal_requires_live_mode", steps: ["classified", "refused"], recalledMemory };
      if (intent.kind === "unknown") return { kind: "refused", reason: "unsupported_intent", steps: ["classified"], recalledMemory };
      const built = buildTradeRequest(intent, { ...config, correlationId: input.correlationId });
      if (built.kind === "invalid") return { kind: "refused", reason: built.reason, steps: ["classified", "refused"], recalledMemory };
      const simulationResult = config.simulator ? await config.simulator.simulate(built.request) : null;
      if (simulationResult && !simulationResult.ok) return { kind: "refused", reason: "simulation_failed", steps: ["classified", "templated", "refused"], recalledMemory };
      const simulation = simulationResult?.ok ? simulationResult.value : undefined;
      if (simulation?.wouldRevert) return { kind: "refused", reason: simulation.revertReason ?? "simulation_would_revert", steps: ["classified", "templated", "simulated", "refused"], recalledMemory };
      return {
        kind: "preview",
        request: built.request,
        trade: { amount: intent.amount, tokenIn: intent.tokenIn, tokenOut: intent.tokenOut, chain: intent.chain },
        ...(simulation ? { simulation } : {}),
        approvalRequired: true,
        checks: ["chain_configured", "tokens_configured", "public_routing", ...(simulation ? ["simulation_passed"] : []), "approval_required"],
        steps: simulation ? ["classified", "templated", "simulated", "previewed"] : ["classified", "templated", "previewed"],
        recalledMemory,
      };
    },
  };
}

export function createChatSession(deps: { readonly pipeline: ReturnType<typeof createChatPipeline>; readonly memory: SessionMemory }) {
  async function recallMemory(input: { readonly user: string; readonly passphrase: string; readonly folder?: string; readonly text: string; readonly timeZone?:string }): Promise<readonly string[]> {
    const recalled = await deps.memory.recall({ user: input.user, passphrase: input.passphrase, query: temporalRecallQuery(input.text,new Date(),input.timeZone), ...(input.folder ? { folder: input.folder } : {}) });
    return recalled.kind === "recalled" && Array.isArray(recalled.records) ? recalled.records : [];
  }
  return {
    recallMemory,
    async handle(input: { readonly user: string; readonly passphrase: string; readonly folder?: string; readonly text: string; readonly correlationId: string }): Promise<ChatPipelineResult> {
      const recalledMemory = await recallMemory(input);
      return deps.pipeline.handle({ text: input.text, correlationId: input.correlationId, recalledMemory });
    },
    async rememberDecision(input: { readonly user: string; readonly passphrase: string; readonly folder?: string; readonly text: string; readonly type?: MemoryEventType; readonly source?: MemoryEventSource; readonly correlationId?: string; readonly timeZone?:string; readonly metadata?: Readonly<Record<string,string|number|boolean|null>> }): Promise<unknown> {
      return deps.memory.remember({ user: input.user, passphrase: input.passphrase, ...(input.folder ? { folder: input.folder } : {}), text: formatMemoryEvent({ type: input.type ?? "preference", source: input.source ?? "web", content: input.text, importance: input.type === "preference" || input.type === "policy_changed" ? "high" : "normal", ...(input.correlationId ? { correlationId: input.correlationId } : {}),...(input.timeZone?{timeZone:input.timeZone}:{}), ...(input.metadata ? { metadata: input.metadata } : {}) }) });
    },
  };
}
import type { Address, ExecutionRequest, KeeperHubClient, Simulation } from "../keeperhub/types.ts";
import { formatMemoryEvent, temporalRecallQuery, type MemoryEventSource, type MemoryEventType } from "../memory/events.ts";

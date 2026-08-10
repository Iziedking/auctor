import type { ChatPipelineResult } from "./pipeline.ts";
import type { AgentPolicyRepository } from "../db/agent-policy-repository.ts";
import type { ExecuteTradeInput, ExecutionAudit } from "../execution/service.ts";
import type { PolicyInput } from "../policy/engine.ts";
import type { Result } from "../result.ts";

export interface TradeMarketSnapshot {
  readonly amountIn: bigint;
  readonly availableBalance: bigint;
  readonly notionalUsdMicros: bigint;
  readonly quotedOut: bigint;
  readonly minOut: bigint;
}

export interface TradeMarketData {
  resolve(input: { readonly chainId: string; readonly tokenIn: string; readonly tokenOut: string; readonly amount: string }): Promise<TradeMarketSnapshot>;
}

type Execution = { executeTrade(input: ExecuteTradeInput): Promise<Result<ExecutionAudit, { readonly code: "policy_refused" | "keeperhub_failed"; readonly message: string }>> };

export async function executeApprovedPreview(input: {
  readonly agentId: string;
  readonly preview: Extract<ChatPipelineResult, { kind: "preview" }>;
  readonly recalledMemory: readonly string[];
  readonly policyRepository: AgentPolicyRepository;
  readonly marketData: TradeMarketData;
  readonly execution: Execution;
  readonly now?: Date;
}) {
  const now = input.now ?? new Date();
  const context = await input.policyRepository.load(input.agentId, now.toISOString().slice(0, 10));
  if (!context) return { kind: "unavailable" as const, reason: "agent_policy_not_found" as const };
  const market = await input.marketData.resolve({ chainId: input.preview.request.chainId, ...input.preview.trade });
  const policyInput: PolicyInput = {
    chainId: input.preview.request.chainId,
    tokenIn: input.preview.trade.tokenIn,
    tokenOut: input.preview.trade.tokenOut,
    amountIn: market.amountIn,
    availableBalance: market.availableBalance,
    notionalUsdMicros: market.notionalUsdMicros,
    spentTodayUsdMicros: context.spentTodayUsdMicros,
    quotedOut: market.quotedOut,
    minOut: market.minOut,
    humanApproved: true,
  };
  const result = await input.execution.executeTrade({ agentId: input.agentId, request: input.preview.request, policyInput, policyRules: context.rules, recalledMemory: input.recalledMemory, now });
  return result.ok ? { kind: "executed" as const, audit: result.value } : { kind: "refused" as const, error: result.error };
}

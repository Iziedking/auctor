import type { Address, ExecutionRequest, KeeperHubClient } from "../keeperhub/types.ts";
import { classifyChat, type ChatPipelineResult } from "./pipeline.ts";

const BASE_CHAIN_ID = "8453";
const BASE_WETH = "0x4200000000000000000000000000000000000006" as const;
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const BASE_SWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481" as const;

export function createLiveChatPipeline(input: {
  readonly walletAddress: Address;
  readonly simulator: Pick<KeeperHubClient, "simulate">;
  readonly slippageBps?: number;
}) {
  const slippageBps = input.slippageBps ?? 100;
  return {
    async handle(command: { readonly text: string; readonly correlationId: string; readonly recalledMemory?: readonly string[] }): Promise<ChatPipelineResult> {
      const recalledMemory = command.recalledMemory ?? [];
      const intent = classifyChat(command.text);
      if (intent.kind === "greeting") return { kind: "message", message: "Auctor is ready.", steps: ["classified"], recalledMemory };
      if (intent.kind === "help") return { kind: "message", message: "Live execution currently supports: swap <amount> ETH to USDC on base.", steps: ["classified"], recalledMemory };
      if (intent.kind === "cancel") return { kind: "message", message: "No transaction was submitted.", steps: ["classified", "cancelled"], recalledMemory };
      if (intent.kind === "preference") return { kind: "message", message: "Preference noted.", steps: ["classified", "remembered"], recalledMemory };
      if (intent.kind !== "trade") return { kind: "refused", reason: "unsupported_intent", steps: ["classified", "refused"], recalledMemory };
      if (intent.chain !== "base" || intent.tokenIn !== "ETH" || intent.tokenOut !== "USDC") return { kind: "refused", reason: "live_pair_not_supported", steps: ["classified", "refused"], recalledMemory };
      const amountIn = decimalToUnits(intent.amount, 18);
      if (amountIn === null || amountIn <= 0n) return { kind: "refused", reason: "invalid_amount", steps: ["classified", "refused"], recalledMemory };
      const quoteRequest = swapRequest(command.correlationId, input.walletAddress, intent.amount, amountIn, 0n);
      const quote = await input.simulator.simulate(quoteRequest);
      if (!quote.ok || quote.value.wouldRevert || !quote.value.simulatedReturnValue) return { kind: "refused", reason: quote.ok ? quote.value.revertReason ?? "simulation_quote_unavailable" : quote.error.message, steps: ["classified", "templated", "refused"], recalledMemory };
      const quotedOut = BigInt(quote.value.simulatedReturnValue);
      const minimumOut = quotedOut * BigInt(10_000 - slippageBps) / 10_000n;
      const request = swapRequest(command.correlationId, input.walletAddress, intent.amount, amountIn, minimumOut);
      const simulation = await input.simulator.simulate(request);
      if (!simulation.ok || simulation.value.wouldRevert) return { kind: "refused", reason: simulation.ok ? simulation.value.revertReason ?? "simulation_would_revert" : simulation.error.message, steps: ["classified", "templated", "simulated", "refused"], recalledMemory };
      return { kind: "preview", request, trade: { amount: intent.amount, tokenIn: "ETH", tokenOut: "USDC", chain: "base" }, simulation: simulation.value, approvalRequired: true, checks: ["chain_configured", "tokens_configured", "slippage_bounded", "simulation_passed", "approval_required"], steps: ["classified", "templated", "quoted", "simulated", "previewed"], recalledMemory };
    },
  };
}

function swapRequest(correlationId: string, recipient: Address, amount: string, amountIn: bigint, amountOutMinimum: bigint): ExecutionRequest {
  return { correlationId, chainId: BASE_CHAIN_ID, privateRouting: false, maxGasUsd: 0, action: { kind: "call", to: BASE_SWAP_ROUTER, functionName: "exactInputSingle", functionArgs: JSON.stringify([{ tokenIn: BASE_WETH, tokenOut: BASE_USDC, fee: "500", recipient, amountIn: amountIn.toString(), amountOutMinimum: amountOutMinimum.toString(), sqrtPriceLimitX96: "0" }]), value: amount } };
}

function decimalToUnits(value: string, decimals: number): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return null;
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) return null;
  return BigInt(match[1]!) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));
}
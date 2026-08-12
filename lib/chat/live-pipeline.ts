import type { Address, ExecutionRequest, KeeperHubClient } from "../keeperhub/types.ts";
import { classifyChat, type ChatPipelineResult } from "./pipeline.ts";

const networks={base:{chainId:"8453",weth:"0x4200000000000000000000000000000000000006",usdc:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",router:"0x2626664c2603336E57B271c5C0b26F421741e481"},sepolia:{chainId:"11155111",weth:"0xfff9976782d46cc05630d1f6ebab18b2324d6b14",usdc:"0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",router:"0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"},"base-sepolia":{chainId:"84532",weth:"0x4200000000000000000000000000000000000006",usdc:"0x036CbD53842c5426634e7929541eC2318f3dCF7c",router:"0x2626664c2603336E57B271c5C0b26F421741e481"}}as const;

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
      if (intent.kind === "help") return { kind: "message", message: "Live execution supports guarded ETH to USDC swaps on Base, Ethereum Sepolia, and Base Sepolia.", steps: ["classified"], recalledMemory };
      if (intent.kind === "cancel") return { kind: "message", message: "No transaction was submitted.", steps: ["classified", "cancelled"], recalledMemory };
      if (intent.kind === "preference") return { kind: "message", message: "Preference noted.", steps: ["classified", "remembered"], recalledMemory };
      if (intent.kind !== "trade") return { kind: "refused", reason: "unsupported_intent", steps: ["classified", "refused"], recalledMemory };
      const network=networks[intent.chain as keyof typeof networks];if (!network || intent.tokenIn !== "ETH" || intent.tokenOut !== "USDC") return { kind: "refused", reason: "live_pair_not_supported", steps: ["classified", "refused"], recalledMemory };
      const amountIn = decimalToUnits(intent.amount, 18);
      if (amountIn === null || amountIn <= 0n) return { kind: "refused", reason: "invalid_amount", steps: ["classified", "refused"], recalledMemory };
      const quoteRequest = swapRequest(network,command.correlationId, input.walletAddress, intent.amount, amountIn, 0n);
      const quote = await input.simulator.simulate(quoteRequest);
      if (!quote.ok || quote.value.wouldRevert || !quote.value.simulatedReturnValue) return { kind: "refused", reason: quote.ok ? quote.value.revertReason ?? "simulation_quote_unavailable" : quote.error.message, steps: ["classified", "templated", "refused"], recalledMemory };
      const quotedOut = BigInt(quote.value.simulatedReturnValue);
      const minimumOut = quotedOut * BigInt(10_000 - slippageBps) / 10_000n;
      const request = swapRequest(network,command.correlationId, input.walletAddress, intent.amount, amountIn, minimumOut);
      const simulation = await input.simulator.simulate(request);
      if (!simulation.ok || simulation.value.wouldRevert) return { kind: "refused", reason: simulation.ok ? simulation.value.revertReason ?? "simulation_would_revert" : simulation.error.message, steps: ["classified", "templated", "simulated", "refused"], recalledMemory };
      return { kind: "preview", request, trade: { amount: intent.amount, tokenIn: "ETH", tokenOut: "USDC", chain: intent.chain }, simulation: simulation.value, approvalRequired: true, checks: ["chain_configured", "tokens_configured", "slippage_bounded", "simulation_passed", "approval_required"], steps: ["classified", "templated", "quoted", "simulated", "previewed"], recalledMemory };
    },
  };
}

function swapRequest(network:(typeof networks)[keyof typeof networks],correlationId: string, recipient: Address, amount: string, amountIn: bigint, amountOutMinimum: bigint): ExecutionRequest {
  return { correlationId, chainId: network.chainId, privateRouting: false, maxGasUsd: 0, action: { kind: "call", to: network.router, functionName: "exactInputSingle", functionArgs: JSON.stringify([{ tokenIn: network.weth, tokenOut: network.usdc, fee: "500", recipient, amountIn: amountIn.toString(), amountOutMinimum: amountOutMinimum.toString(), sqrtPriceLimitX96: "0" }]), value: amount } };
}

function decimalToUnits(value: string, decimals: number): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return null;
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) return null;
  return BigInt(match[1]!) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));
}

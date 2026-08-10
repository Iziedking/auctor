import assert from "node:assert/strict";
import test from "node:test";
import { executeApprovedPreview } from "../lib/chat/approved-trade.ts";
import { createChatPipeline } from "../lib/chat/pipeline.ts";
import { ok } from "../lib/result.ts";
import { createMockTradeMarketData } from "../lib/chat/mock-market-data.ts";

const pipeline = createChatPipeline({ mode: "mock", chains: { base: "8453" }, tokens: { USDC: "0x1111111111111111111111111111111111111111", WETH: "0x2222222222222222222222222222222222222222" }, router: "0x3333333333333333333333333333333333333333" });

test("approved preview uses persisted policy and authoritative market data", async () => {
  const preview = await pipeline.handle({ text: "swap 1 USDC to WETH on base", correlationId: "approved-1", recalledMemory: ["Use Base only."] });
  assert.equal(preview.kind, "preview"); if (preview.kind !== "preview") return;
  const calls: unknown[] = [];
  const result = await executeApprovedPreview({ agentId: "agent-1", preview, recalledMemory: preview.recalledMemory, now: new Date("2026-08-08T10:00:00Z"), policyRepository: { async load() { return { rules: { emergencyStop: false, allowedChains: ["8453"], allowedTokens: ["USDC", "WETH"], maxTradeUsdMicros: 5_000_000n, maxDailyUsdMicros: 20_000_000n, maxSlippageBps: 100n, approvalMode: "human" }, spentTodayUsdMicros: 2_000_000n }; } }, marketData: { async resolve() { return { amountIn: 1n, availableBalance: 2n, notionalUsdMicros: 1_000_000n, quotedOut: 100n, minOut: 99n }; } }, execution: { async executeTrade(input) { calls.push(input); return ok({ id: "audit-1", agentId: "agent-1", correlationId: "approved-1", status: "confirmed" as const }); } } });
  assert.equal(result.kind, "executed");
  assert.equal(calls.length, 1);
  assert.deepEqual((calls[0] as { policyInput: { spentTodayUsdMicros: bigint; humanApproved: boolean }; recalledMemory: readonly string[] }).policyInput.spentTodayUsdMicros, 2_000_000n);
  assert.equal((calls[0] as { policyInput: { humanApproved: boolean } }).policyInput.humanApproved, true);
  assert.deepEqual((calls[0] as { recalledMemory: readonly string[] }).recalledMemory, ["Use Base only."]);
});

test("approved preview fails closed when agent policy is missing", async () => {
  const preview = await pipeline.handle({ text: "swap 1 USDC to WETH on base", correlationId: "approved-2" });
  assert.equal(preview.kind, "preview"); if (preview.kind !== "preview") return;
  const result = await executeApprovedPreview({ agentId: "missing", preview, recalledMemory: [], policyRepository: { async load() { return null; } }, marketData: { async resolve() { throw new Error("must not run"); } }, execution: { async executeTrade() { throw new Error("must not run"); } } });
  assert.deepEqual(result, { kind: "unavailable", reason: "agent_policy_not_found" });
});

test("mock market data is restricted to the captured Base ETH to USDC trade", async () => {
  const market = createMockTradeMarketData();
  const snapshot = await market.resolve({ chainId: "8453", tokenIn: "ETH", tokenOut: "USDC", amount: "0.001" });
  assert.equal(snapshot.amountIn, 1_000_000_000_000_000n);
  assert.equal(snapshot.notionalUsdMicros, 1_902_600n);
  await assert.rejects(() => market.resolve({ chainId: "8453", tokenIn: "USDC", tokenOut: "WETH", amount: "1" }), /mock_market_pair_not_available/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePolicy, type PolicyInput, type PolicyRules } from "../lib/policy/engine.ts";

const rules: PolicyRules = {
  emergencyStop: false,
  allowedChains: ["8453"],
  allowedTokens: ["0xweth", "0xusdc"],
  maxTradeUsdMicros: 5_000_000n,
  maxDailyUsdMicros: 10_000_000n,
  maxSlippageBps: 100n,
  approvalMode: "autonomous",
};
const input: PolicyInput = {
  chainId: "8453",
  tokenIn: "0xweth",
  tokenOut: "0xusdc",
  amountIn: 1_000n,
  availableBalance: 2_000n,
  notionalUsdMicros: 2_000_000n,
  spentTodayUsdMicros: 1_000_000n,
  quotedOut: 2_000_000n,
  minOut: 1_990_000n,
  humanApproved: false,
};

const reasonCodes = (overrides: Partial<PolicyInput>, ruleOverrides: Partial<PolicyRules> = {}) =>
  evaluatePolicy({ ...input, ...overrides }, { ...rules, ...ruleOverrides }).reasons.map((reason) => reason.code);

test("emergency stop refuses every trade", () => assert.deepEqual(reasonCodes({}, { emergencyStop: true }), ["emergency_stop"]));
test("wrong chain is refused", () => assert.deepEqual(reasonCodes({ chainId: "1" }), ["chain_not_allowed"]));
test("disallowed token is refused", () => assert.deepEqual(reasonCodes({ tokenOut: "0xdai" }), ["token_not_allowed"]));
test("per-trade cap is enforced", () => assert.deepEqual(reasonCodes({ notionalUsdMicros: 5_000_001n }), ["trade_cap_exceeded"]));
test("daily cap includes the proposed trade", () => assert.deepEqual(reasonCodes({ spentTodayUsdMicros: 9_000_000n, notionalUsdMicros: 2_000_000n }), ["daily_cap_exceeded"]));
test("insufficient token balance is refused", () => assert.deepEqual(reasonCodes({ amountIn: 2_001n }), ["insufficient_balance"]));
test("slippage below the configured floor is refused", () => assert.deepEqual(reasonCodes({ minOut: 1_979_999n }), ["slippage_exceeded"]));
test("human approval mode refuses an unapproved trade", () => assert.deepEqual(reasonCodes({}, { approvalMode: "human" }), ["approval_required"]));
test("an allowed trade returns every passing check", () => {
  const verdict = evaluatePolicy(input, rules);
  assert.equal(verdict.allowed, true);
  assert.equal(verdict.reasons.length, 0);
  assert.equal(verdict.checks.every((check) => check.passed), true);
});

test("invalid slippage configuration is rejected", () => {
  assert.throws(() => evaluatePolicy(input, { ...rules, maxSlippageBps: 10_001n }), /cannot exceed/);
});

test("agent policy settings resolve to deterministic engine rules", async () => {
  const { resolvePolicyRules } = await import("../lib/policy/agent-rules.ts");
  const resolved = resolvePolicyRules({ emergencyStop: false, allowedChains: ["8453"], allowedTokens: ["ETH", "USDC"], perTradeCapUsd: "5.25", dailyCapUsd: "20", maxSlippageBps: 75, approvalMode: "approve" });
  assert.equal(resolved.maxTradeUsdMicros, 5_250_000n);
  assert.equal(resolved.maxDailyUsdMicros, 20_000_000n);
  assert.equal(resolved.approvalMode, "human");
});

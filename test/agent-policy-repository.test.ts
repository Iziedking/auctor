import assert from "node:assert/strict";
import test from "node:test";
import { createAgentPolicyContext } from "../lib/db/agent-policy-repository.ts";

test("agent policy context combines persisted rules with today's trade spend", () => {
  const context = createAgentPolicyContext({ emergencyStop: false, allowedChains: ["8453"], allowedTokens: ["ETH", "USDC"], perTradeCapUsd: "5", dailyCapUsd: "20", maxSlippageBps: 100, approvalMode: "approve" }, "3.250001");
  assert.equal(context.spentTodayUsdMicros, 3_250_001n);
  assert.equal(context.rules.maxTradeUsdMicros, 5_000_000n);
  assert.equal(context.rules.approvalMode, "human");
});

test("agent policy context rejects malformed database money values", () => {
  assert.throws(() => createAgentPolicyContext({ emergencyStop: false, allowedChains: [], allowedTokens: [], perTradeCapUsd: "5", dailyCapUsd: "20", maxSlippageBps: 100, approvalMode: "autonomous" }, "3.2500001"), /Invalid USD amount/);
});

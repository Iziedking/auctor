import assert from "node:assert/strict";
import test from "node:test";
import { createExecutionService, type ExecutionAudit, type ExecutionRepository } from "../lib/execution/service.ts";
import type { ExecutionStatus, KeeperHubClient } from "../lib/keeperhub/types.ts";
import { ok } from "../lib/result.ts";
const request = { correlationId: "corr-1", chainId: "8453", privateRouting: false, maxGasUsd: 1, action: { kind: "transfer", to: "0x0000000000000000000000000000000000000001", amount: "1" } } as const;
const policyInput = { chainId: "8453", tokenIn: "ETH", tokenOut: "USDC", amountIn: 1n, availableBalance: 2n, notionalUsdMicros: 2_000_000n, spentTodayUsdMicros: 0n, quotedOut: 100n, minOut: 99n, humanApproved: true };
const policyRules = { emergencyStop: false, allowedChains: ["8453"], allowedTokens: ["ETH", "USDC"], maxTradeUsdMicros: 3_000_000n, maxDailyUsdMicros: 5_000_000n, maxSlippageBps: 100n, approvalMode: "human" as const };
function fixture() {
  let audit: ExecutionAudit | null = null; const events: string[] = []; const spends: bigint[] = [];
  const repository: ExecutionRepository = {
    async find(agentId, correlationId) { return audit?.agentId === agentId && audit.correlationId === correlationId ? audit : null; },
    async claim(input) { events.push("created"); audit = { id: "audit-1", ...input, status: "pending" }; return { audit, created: true }; },
    async recordPolicy(_id, verdict, status) { events.push(`policy:${status}`); return audit = { ...audit!, policyVerdict: verdict, status }; },
    async recordSimulation(_id, simulation) { events.push("simulated"); return audit = { ...audit!, simulation, status: "simulating" }; },
    async recordSubmission(_id, keeperHubExecutionId) { events.push("submitted"); return audit = { ...audit!, keeperHubExecutionId, status: "submitted" }; },
    async recordTerminal(_id, status) { events.push("confirmed"); return audit = { ...audit!, ...(status.transactionHash ? { transactionHash: status.transactionHash } : {}), status: "confirmed" }; },
    async recordFailure(_id, reason) { events.push(`failed:${reason}`); return audit = { ...audit!, status: "failed" }; },
    async addSpend(input) { events.push(`spend:${input.utcDay}`); spends.push(input.amountUsdMicros); },
  };
  const terminal: ExecutionStatus = { executionId: "kh-1", status: "completed", sponsored: true, transactionHash: "0xabc", receipts: [{ hash: "0xabc", chainId: 8453, verified: true, receiptStatus: "success" }] };
  const keeperHub: KeeperHubClient = { async simulate() { events.push("kh:simulate"); return ok({ status: "simulated", gasEstimate: "21000", wouldRevert: false }); }, async execute() { events.push("kh:execute"); return ok({ executionId: "kh-1", status: "pending" }); }, async status() { events.push("kh:status"); return ok(terminal); } };
  return { repository, keeperHub, events, spends };
}
test("execution lifecycle persists policy simulation receipt and spend", async () => { const x = fixture(); const result = await createExecutionService(x).executeTrade({ agentId: "agent-1", request, policyInput, policyRules, now: new Date("2026-08-06T12:00:00Z") }); assert.equal(result.ok, true); if (result.ok) assert.equal(result.value.transactionHash, "0xabc"); assert.deepEqual(x.spends, [2_000_000n]); assert.deepEqual(x.events, ["created", "policy:simulating", "kh:simulate", "simulated", "kh:execute", "submitted", "kh:status", "confirmed", "spend:2026-08-06"]); });
test("policy refusal is persisted and never reaches KeeperHub", async () => { const x = fixture(); const result = await createExecutionService(x).executeTrade({ agentId: "agent-1", request, policyInput, policyRules: { ...policyRules, emergencyStop: true } }); assert.equal(result.ok, false); assert.deepEqual(x.events, ["created", "policy:refused"]); });
test("agent correlation replay returns the existing audit without spending twice", async () => { const x = fixture(); const service = createExecutionService(x); const input = { agentId: "agent-1", request, policyInput, policyRules, now: new Date("2026-08-06T12:00:00Z") }; await service.executeTrade(input); await service.executeTrade(input); assert.equal(x.events.filter((event) => event === "kh:execute").length, 1); assert.deepEqual(x.spends, [2_000_000n]); });
test("execution audit preserves the memory recalled for a trade decision", async () => { const x = fixture(); const recalledMemory = ["Never trade more than $3."]; const result = await createExecutionService(x).executeTrade({ agentId: "agent-1", request, policyInput, policyRules, recalledMemory }); assert.equal(result.ok, true); if (result.ok) assert.deepEqual(result.value.recalledMemory, recalledMemory); });

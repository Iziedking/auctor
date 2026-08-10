import assert from "node:assert/strict";
import test from "node:test";
import { notifyConfirmedExecution } from "../lib/notifications/execution.ts";

test("confirmed execution sends enabled specs and records delivery evidence", async () => {
  const recorded: unknown[] = [];
  const result = await notifyConfirmedExecution({
    audit: { id: "audit-1", agentId: "agent-1", status: "confirmed", transactionHash: "0xabc" },
    specs: { async listEnabled() { return [{ channel: "telegram" as const, chatId: "chat-1" }]; } },
    fanout: { async send(input: readonly { text: string }[]) { assert.equal(input[0]?.text.includes("audit-1"), true); assert.equal(input[0]?.text.includes("0xabc"), true); return { attempted: 1, delivered: 1, results: [{ delivered: true, preview: false, messageId: 42 }] }; } },
    auditRepository: { async recordNotification(id: string, evidence: unknown) { recorded.push({ id, evidence }); } },
  });
  assert.equal(result.delivered, 1);
  assert.deepEqual(recorded, [{ id: "audit-1", evidence: result }]);
});

test("notification failure is recorded without changing confirmed execution", async () => {
  const recorded: unknown[] = [];
  const result = await notifyConfirmedExecution({
    audit: { id: "audit-2", agentId: "agent-1", status: "confirmed" },
    specs: { async listEnabled() { return [{ channel: "telegram" as const, chatId: "chat-2" }]; } },
    fanout: { async send() { return { attempted: 1, delivered: 0, results: [{ delivered: false, preview: false, messageId: null, reason: "telegram_failed" as const }] }; } },
    auditRepository: { async recordNotification(id: string, evidence: unknown) { recorded.push({ id, evidence }); } },
  });
  assert.equal(result.delivered, 0);
  assert.equal(recorded.length, 1);
});

test("non-confirmed execution does not notify", async () => {
  let calls = 0;
  const result = await notifyConfirmedExecution({
    audit: { id: "audit-3", agentId: "agent-1", status: "refused" },
    specs: { async listEnabled() { calls += 1; return []; } },
    fanout: { async send() { calls += 1; return { attempted: 0, delivered: 0, results: [] }; } },
    auditRepository: { async recordNotification() { calls += 1; } },
  });
  assert.deepEqual(result, { attempted: 0, delivered: 0, results: [] });
  assert.equal(calls, 0);
});

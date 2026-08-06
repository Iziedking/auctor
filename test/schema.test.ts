import assert from "node:assert/strict";
import test from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { executions, spendLedger } from "../lib/db/schema.ts";

test("executions enforce agent-scoped correlation idempotency", () => {
  const config = getTableConfig(executions);
  const index = config.indexes.find((item) => item.config.name === "executions_idempotency");
  assert.equal(index?.config.unique, true);
});

test("execution audit schema includes policy simulation and receipt fields", () => {
  assert.ok(executions.policyDetail);
  assert.ok(executions.simulation);
  assert.ok(executions.khExecutionId);
  assert.ok(executions.txHash);
  assert.ok(executions.receipt);
  assert.ok(executions.status);
});

test("spend ledger has an agent day and kind lookup index", () => {
  const config = getTableConfig(spendLedger);
  assert.ok(config.indexes.some((item) => item.config.name === "spend_ledger_day"));
  assert.ok(config.indexes.some((item) => item.config.name === "spend_ledger_execution_kind" && item.config.unique));
});

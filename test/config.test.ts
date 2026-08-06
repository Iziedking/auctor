import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../lib/config.ts";

test("missing optional keys disable only their capabilities", () => {
  const config = loadConfig({});
  assert.equal(config.capabilities.database, false);
  assert.equal(config.capabilities.execution, false);
  assert.equal(config.capabilities.memory, false);
  assert.equal(config.capabilities.llm, false);
  assert.equal(config.budgets.llmCallsPerDay, 0);
});
test("mock mode enables the money path without a key", () => {
  const config = loadConfig({ AUCTOR_MOCK_MODE: "1" });
  assert.equal(config.capabilities.execution, true);
  assert.equal(config.capabilities.x402, true);
  assert.equal(config.capabilities.llm, true);
});
test("zero is a real budget kill switch", () => {
  assert.deepEqual(loadConfig({ RESEARCH_USD_PER_DAY: "0", LLM_CALLS_PER_DAY: "0" }).budgets, { researchUsdPerDay: 0, llmCallsPerDay: 0 });
});
test("invalid numeric configuration fails fast", () => {
  assert.throws(() => loadConfig({ LLM_CALLS_PER_DAY: "1.5" }), /non-negative integer/);
});

test("database capability requires an explicit URL", () => {
  const config = loadConfig({ DATABASE_URL: "postgres://localhost/auctor" });
  assert.equal(config.capabilities.database, true);
  assert.equal(config.database.url, "postgres://localhost/auctor");
});
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
test("server-only agent identity requires an id and complete memory credentials", () => {
  const config = loadConfig({ AUCTOR_AGENT_ID: "agent-1", AGENT_MEMORY_USER: "user@example.com", AGENT_MEMORY_PASSPHRASE: "secret", AGENT_MEMORY_FOLDER: "project-x" });
  assert.deepEqual(config.agent, { id: "agent-1", memoryUser: "user@example.com", memoryPassphrase: "secret", memoryFolder: "project-x" });
  assert.equal(config.capabilities.memory, true);
});

test("KeeperHub wallet address is loaded for live trade previews", () => {
  const walletAddress = "0xeDd7A8cdE35Dd2d30d821861e52bF9329c165386";
  assert.equal(loadConfig({ KEEPERHUB_WALLET_ADDRESS: walletAddress }).keeperhub.walletAddress, walletAddress);
});
test("AgentRouter is configured only as the Anthropic fallback",()=>{const config=loadConfig({LLM_PROVIDER:"anthropic",ANTHROPIC_API_KEY:"primary",AGENTROUTER_API_KEY:"fallback",AGENTROUTER_BASE_URL:"https://agentrouter.org",AGENTROUTER_MODEL:"claude-opus-4-8"});assert.equal(config.llm.apiKey,"primary");assert.deepEqual(config.llm.fallback,{baseUrl:"https://agentrouter.org",apiKey:"fallback",model:"claude-opus-4-8"})});

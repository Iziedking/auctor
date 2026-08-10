import assert from "node:assert/strict";
import test from "node:test";
import { buildCapabilityHealth } from "../lib/health.ts";
import { loadConfig } from "../lib/config.ts";

test("capability health reports effective states without exposing credentials", async () => {
  const config = loadConfig({ AUCTOR_MOCK_MODE: "1", AUCTOR_AGENT_ID: "agent-1", AGENT_MEMORY_USER: "u", AGENT_MEMORY_PASSPHRASE: "secret" });
  const health = await buildCapabilityHealth(config, { async memoryStatus() { return { kind: "available", bufferedLocal: 2, cachedLocal: 4, quilts: 1, lastFlush: null, nextFlushAt: null, lastFlushError: null }; } });
  assert.equal(health.execution, "mock");
  assert.equal(health.memory.state, "available");
  assert.deepEqual(health.approval, { mode: "fixture", available: false });
  assert.equal(JSON.stringify(health).includes("secret"), false);
});

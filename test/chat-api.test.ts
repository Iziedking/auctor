import assert from "node:assert/strict";
import test from "node:test";
import { handleChatRequest } from "../lib/chat/api.ts";
import { createChatPipeline, createChatSession } from "../lib/chat/pipeline.ts";

const pipeline = createChatPipeline({
  mode: "mock",
  chains: { base: "8453" },
  tokens: { USDC: "0x1111111111111111111111111111111111111111", WETH: "0x2222222222222222222222222222222222222222" },
  router: "0x3333333333333333333333333333333333333333",
});

test("chat API boundary rejects malformed input and returns a mock preview", async () => {
  assert.deepEqual(await handleChatRequest({ text: "" }, { pipeline }), { status: 400, body: { error: "invalid_request" } });
  const response = await handleChatRequest({ text: "swap 1 USDC to WETH on base", correlationId: "api-1" }, { pipeline });
  assert.equal(response.status, 200);
  assert.equal(response.body.kind, "preview");
});
test("chat API uses authenticated conversation persistence when injected", async () => {
  const calls: unknown[] = [];
  const conversation = { async handle(input: unknown) { calls.push(input); return { conversationId: "00000000-0000-0000-0000-000000000001", response: await pipeline.handle({ text: "hello", correlationId: "api-2" }) }; } };
  const response = await handleChatRequest({ text: "hello", correlationId: "api-2" }, { pipeline, conversation, agentId: "00000000-0000-0000-0000-000000000002" });
  assert.equal("conversationId" in response.body ? response.body.conversationId : null, "00000000-0000-0000-0000-000000000001");
  assert.equal(calls.length, 1);
});
test("chat API remembers explicit preferences when conversation persistence is enabled", async () => {
  const remembered: unknown[] = [];
  const session = { async recallMemory() { return []; }, async rememberDecision(input: unknown) { remembered.push(input); return { kind: "stored" as const, local: true }; } };
  const conversation = { async handle() { return { conversationId: "00000000-0000-4000-8000-000000000010", response: { kind: "message" as const, message: "Preference noted.", steps: ["classified", "remembered"], recalledMemory: [] } }; } };
  const response = await handleChatRequest({ text: "Remember: use Base only", correlationId: "api-persisted-memory-1" }, { pipeline, session: session as never, identity: { user: "user-1", passphrase: "secret", folder: "preferences" }, conversation: conversation as never, agentId: "00000000-0000-4000-8000-000000000011" });
  assert.equal(response.status, 200);
  assert.equal(remembered.length, 1);
});
test("chat API accepts a bounded conversation id for turn reuse", async () => {
  const response = await handleChatRequest({ text: "hello", correlationId: "api-3", conversationId: "00000000-0000-4000-8000-000000000001", approved: false }, { pipeline });
  assert.equal(response.status, 200);
});

test("chat API stores explicit preferences for the next session", async () => {
  const remembered: unknown[] = [];
  const session = { async recallMemory() { return []; }, async handle() { return { kind: "message" as const, message: "Preference noted.", steps: ["classified"], recalledMemory: [] }; }, async rememberDecision(input: unknown) { remembered.push(input); return { kind: "stored" as const, local: true }; } };
  const response = await handleChatRequest({ text: "Remember: use Base only", correlationId: "api-memory-1" }, { pipeline, session, identity: { user: "user-1", passphrase: "secret", folder: "preferences" } });
  assert.equal(response.status, 200);
  assert.equal(remembered.length, 1);
});

test("chat API carries recalled preference into the next session response", async () => {
  const recalled = ["Use Base only and avoid trades over $5."];
  const memory = { async recall() { return { kind: "recalled" as const, records: recalled }; }, async remember() { return { kind: "stored" as const, local: true }; } };
  const session = createChatSession({ pipeline, memory });
  const response = await handleChatRequest({ text: "swap 1 USDC to WETH on base", correlationId: "api-memory-2" }, { pipeline, session, identity: { user: "user-1", passphrase: "secret", folder: "preferences" } });
  assert.equal(response.status, 200);
  assert.deepEqual("recalledMemory" in response.body ? response.body.recalledMemory : [], recalled);
});


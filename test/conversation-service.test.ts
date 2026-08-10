import assert from "node:assert/strict";
import test from "node:test";
import { createConversationService, type ConversationRepository } from "../lib/chat/conversation-service.ts";
import { createChatPipeline } from "../lib/chat/pipeline.ts";

test("conversation service persists the user command and agent preview with recalled memory", async () => {
  const events: unknown[] = [];
  const repository: ConversationRepository = {
    async open(input) { events.push(["open", input]); return "conversation-1"; },
    async append(input) { events.push(["append", input]); },
  };
  const pipeline = createChatPipeline({ mode: "mock", chains: { base: "8453" }, tokens: { USDC: "0x1111111111111111111111111111111111111111", WETH: "0x2222222222222222222222222222222222222222" }, router: "0x3333333333333333333333333333333333333333" });
  const service = createConversationService({ repository, pipeline });
  const result = await service.handle({ agentId: "agent-1", text: "swap 1 USDC to WETH on base", correlationId: "turn-1", recalledMemory: ["Use Base only."] });
  assert.equal(result.conversationId, "conversation-1");
  assert.equal(result.response.kind, "preview");
  assert.deepEqual(events.map((event) => (event as unknown[])[0]), ["open", "append", "append"]);
  assert.deepEqual((events[2] as [string, { recalledMemory: readonly string[] }])[1].recalledMemory, ["Use Base only."]);
});

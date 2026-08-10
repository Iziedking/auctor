import assert from "node:assert/strict";
import test from "node:test";
import { createNotificationFanout } from "../lib/notifications/fanout.ts";

test("notification fanout keeps mock delivery preview-only", async () => {
  const fanout = createNotificationFanout({ telegram: { async send() { return { delivered: false, preview: true, messageId: null }; } } });
  assert.deepEqual(await fanout.send([{ channel: "telegram", chatId: "chat-1", text: "Trade confirmed" }]), { attempted: 1, delivered: 0, results: [{ delivered: false, preview: true, messageId: null }] });
});

test("notification fanout reports partial delivery without hiding failures", async () => {
  let calls = 0;
  const fanout = createNotificationFanout({ telegram: { async send() { calls += 1; return calls === 1 ? { delivered: true, preview: false, messageId: 7 } : { delivered: false, preview: false, messageId: null, reason: "telegram_failed" }; } } });
  const result = await fanout.send([
    { channel: "telegram", chatId: "chat-1", text: "One" },
    { channel: "telegram", chatId: "chat-2", text: "Two" },
  ]);
  assert.equal(result.attempted, 2);
  assert.equal(result.delivered, 1);
  assert.equal(result.results[1]?.reason, "telegram_failed");
});

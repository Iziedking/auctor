import assert from "node:assert/strict";
import test from "node:test";
import { createDrizzleNotificationRepository } from "../lib/db/notification-repository.ts";

test("notification repository exposes only Telegram targets", async () => {
  const calls: unknown[] = [];
  const db = {
    select() { calls.push("select"); return { from() { return { where: async () => [{ channel: "telegram", target: "chat-1" }, { channel: "email", target: "x" }] }; } }; },
  } as never;
  const repository = createDrizzleNotificationRepository(db);
  assert.deepEqual(await repository.listEnabled("agent-1"), [{ channel: "telegram", chatId: "chat-1" }]);
  assert.equal(calls.length, 1);
});

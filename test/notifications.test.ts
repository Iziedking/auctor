import assert from "node:assert/strict";
import test from "node:test";
import { createTelegramNotifier } from "../lib/notifications/telegram.ts";
test("mock telegram notifier returns a preview without network", async () => { const notifier = createTelegramNotifier({ token: null, mockMode: true }); const result = await notifier.send({ chatId: "123", text: "Trade confirmed" }); assert.deepEqual(result, { delivered: false, preview: true, messageId: null }); });
test("telegram notifier refuses when credentials are absent", async () => { const notifier = createTelegramNotifier({ token: null, mockMode: false }); const result = await notifier.send({ chatId: "123", text: "Trade confirmed" }); assert.equal(result.reason, "telegram_not_configured"); });
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("Notifications presents Telegram as plain-English access to the user's Auctor agent",async()=>{
  const source=await readFile(new URL("../components/notifications/telegram-connection.tsx",import.meta.url),"utf8");
  assert.match(source,/Talk to your Auctor agent from anywhere/i);
  assert.match(source,/plain English/i);
  assert.match(source,/@\{username\}/);
});
test("Telegram connection is rendered as the final action after notification history",async()=>{const source=await readFile(new URL("../app/notifications/page.tsx",import.meta.url),"utf8");assert.ok(source.indexOf("<NotificationCenter/>")<source.indexOf("<TelegramConnection/>"))});

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
test("auth repository provisions one persistent agent transactionally",async()=>{const source=await readFile(new URL("../lib/db/auth-repository.ts",import.meta.url),"utf8");assert.match(source,/db\.transaction/);assert.match(source,/agents\.userId/);assert.match(source,/userSessions/);assert.match(source,/autonomyMode/)});
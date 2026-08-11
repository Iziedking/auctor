import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNextPath } from "../lib/auth/redirect.ts";
test("safe next accepts only authenticated product paths",()=>{assert.equal(safeNextPath("/agent"),"/agent");assert.equal(safeNextPath("/chat?conversation=abc"),"/chat?conversation=abc");assert.equal(safeNextPath("/audit?id=case-1"),"/audit?id=case-1")});
test("safe next rejects external and unknown paths",()=>{for(const value of[null,"https://evil.example","//evil.example","/api/health","/unknown"])assert.equal(safeNextPath(value),"/agent")});

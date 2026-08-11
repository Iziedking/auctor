import assert from "node:assert/strict";
import { test } from "node:test";
import { createPairingCode, normalizeExternalIdentity } from "../lib/auth/channel-pairing.ts";
test("channel pairing creates a short expiring code",()=>{const result=createPairingCode(1000);assert.match(result.code,/^\d{6}$/);assert.equal(result.expiresAt.getTime(),601000);assert.notEqual(result.hash,result.code)});
test("channel identities are provider specific",()=>{assert.equal(normalizeExternalIdentity("telegram"," 12345 "),"12345");assert.equal(normalizeExternalIdentity("whatsapp","+2348012345678"),"+2348012345678");assert.throws(()=>normalizeExternalIdentity("telegram","@name"));assert.throws(()=>normalizeExternalIdentity("whatsapp","08012345678"))});
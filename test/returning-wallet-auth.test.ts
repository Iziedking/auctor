import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("returning Auctor wallets restore their session before KeeperHub reprovisioning",async()=>{const source=await readFile(new URL("../app/api/auth/siwe/verify/route.ts",import.meta.url),"utf8");assert.match(source,/validateKeeperHubSiweMessage/);assert.ok(source.indexOf("existingUser")<source.indexOf("api/auth/siwe/verify"));assert.match(source,/walletReady:Boolean\(existingAgent\?\.khWalletAddress\)/)});

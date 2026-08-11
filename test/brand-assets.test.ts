import assert from "node:assert/strict";
import test from "node:test";
import { readFile, stat } from "node:fs/promises";
const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
test("Auctor exposes a scalable Ascending Reserve icon", async () => { const icon = await read("app/icon.svg"); assert.match(icon, /viewBox="0 0 64 64"/); assert.match(icon, /#0B0F0D/i); assert.match(icon, /#F3F1E8/i); assert.match(icon, /#19A7A0/i); assert.doesNotMatch(icon, /<text/i); });
test("public shell uses the Auctor brand without internal status labels", async () => { const shell = await read("components/app-shell.tsx"); const mark = await read("components/brand/auctor-mark.tsx"); assert.match(shell, /AuctorLockup/); assert.match(mark, /INTELLIGENT CAPITAL/); assert.doesNotMatch(shell, /ShieldCheck|KEEPER \/ MOCK|FIXTURE/i); });
test("root metadata declares favicon, Apple icon, and social image", async () => { const layout = await read("app/layout.tsx"); assert.match(layout, /icons:/); assert.match(layout, /openGraph:/); assert.match(layout, /themeColor/); });
test("generated favicon assets are non-empty", async () => { assert.ok((await stat(new URL("../app/favicon.ico", import.meta.url))).size > 100); assert.ok((await stat(new URL("../app/apple-icon.png", import.meta.url))).size > 1000); });
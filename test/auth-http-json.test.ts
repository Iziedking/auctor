import assert from "node:assert/strict";
import { test } from "node:test";
import { readAuthJson } from "../lib/auth/http-json.ts";

test("auth JSON parser returns structured JSON", async()=>{assert.deepEqual(await readAuthJson(Response.json({authenticated:true})),{authenticated:true})});
test("auth JSON parser replaces empty and HTML responses with stable errors",async()=>{await assert.rejects(()=>readAuthJson(new Response("",{status:502})),/temporarily unavailable/i);await assert.rejects(()=>readAuthJson(new Response("<html>bad gateway</html>",{status:502,headers:{"content-type":"text/html"}})),/temporarily unavailable/i)});
test("auth JSON parser preserves a structured API error",async()=>{await assert.rejects(()=>readAuthJson(Response.json({error:"signature_verification_failed"},{status:401})),/signature could not be verified/i)});

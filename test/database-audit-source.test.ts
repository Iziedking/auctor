import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseAuditSource } from "../lib/audit/database-source.ts";

test("database audit source scopes every execution to the authenticated agent", async () => {
  const calls: unknown[] = [];
  const row = { id:"1",agentId:"agent-1",correlationId:"c",status:"confirmed",chainId:"8453",intent:{action:{kind:"call"}},policyVerdict:"allowed",policyDetail:{allowed:true,checks:[],reasons:[]},createdAt:new Date("2026-08-12T00:00:00Z"),recalledMemory:[],researchUsed:[],simulation:null,khExecutionId:null,txHash:null,receipt:null };
  const db = { select(){ return { from(){ return { where(condition:unknown){ calls.push(condition);return { orderBy(){return { limit:async()=>[row] }} } } } } } } };
  const source = createDatabaseAuditSource(db as never,"agent-1","Atlas");
  const result = await source.list({});
  assert.equal(result.kind,"ready");
  assert.equal(calls.length,1);
});

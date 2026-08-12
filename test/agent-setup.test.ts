import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAgentSetup } from "../lib/agent/setup.ts";
test("agent setup defaults to one manual Auctor agent",()=>{const setup=validateAgentSetup({});assert.equal(setup.name,"Auctor Agent");assert.equal(setup.autonomyMode,"manual");assert.equal(setup.budgetUsd,0);assert.deepEqual(setup.allowedTokens,[]);assert.equal(setup.maxSlippageBps,100)});
test("agent setup rejects caps above their parent budget",()=>{assert.throws(()=>validateAgentSetup({budgetUsd:100,dailyCapUsd:110}),/Daily cap/);assert.throws(()=>validateAgentSetup({budgetUsd:100,dailyCapUsd:50,perTradeCapUsd:60}),/Per-trade cap/)});
test("autonomous setup remains explicitly bounded",()=>{const setup=validateAgentSetup({autonomyMode:"autonomous",budgetUsd:100,dailyCapUsd:25,perTradeCapUsd:10,allowedChains:["8453","1"]});assert.equal(setup.autonomyMode,"autonomous");assert.equal(setup.dailyCapUsd,25)});
test("default setup enables every stable KeeperHub EVM chain",()=>{const setup=validateAgentSetup({});assert.deepEqual(setup.allowedChains,["1","8453","42161","10","137","56","43114","130"])});

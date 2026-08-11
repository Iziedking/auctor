import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAgentSetup } from "../lib/agent/setup.ts";
test("agent setup defaults to one manual Auctor agent",()=>{assert.deepEqual(validateAgentSetup({}),{name:"Auctor Agent",autonomyMode:"manual",budgetUsd:0,dailyCapUsd:0,perTradeCapUsd:0,allowedChains:["8453"],allowedTokens:[],maxSlippageBps:100})});
test("agent setup rejects caps above their parent budget",()=>{assert.throws(()=>validateAgentSetup({budgetUsd:100,dailyCapUsd:110}),/Daily cap/);assert.throws(()=>validateAgentSetup({budgetUsd:100,dailyCapUsd:50,perTradeCapUsd:60}),/Per-trade cap/)});
test("autonomous setup remains explicitly bounded",()=>{const setup=validateAgentSetup({autonomyMode:"autonomous",budgetUsd:100,dailyCapUsd:25,perTradeCapUsd:10,allowedChains:["8453","1"]});assert.equal(setup.autonomyMode,"autonomous");assert.equal(setup.dailyCapUsd,25)});
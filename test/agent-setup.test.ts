import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAgentSetup } from "../lib/agent/setup.ts";
import { chainsForEnvironment, faucetForChain, inferChainEnvironment } from "../lib/chains.ts";
test("agent setup defaults to one manual Auctor agent",()=>{const setup=validateAgentSetup({});assert.equal(setup.name,"Auctor Agent");assert.equal(setup.autonomyMode,"manual");assert.equal(setup.budgetUsd,0);assert.deepEqual(setup.allowedTokens,[]);assert.equal(setup.maxSlippageBps,100)});
test("agent setup rejects caps above their parent budget",()=>{assert.throws(()=>validateAgentSetup({budgetUsd:100,dailyCapUsd:110}),/Daily cap/);assert.throws(()=>validateAgentSetup({budgetUsd:100,dailyCapUsd:50,perTradeCapUsd:60}),/Per-trade cap/)});
test("autonomous setup remains explicitly bounded",()=>{const setup=validateAgentSetup({autonomyMode:"autonomous",budgetUsd:100,dailyCapUsd:25,perTradeCapUsd:10,allowedChains:["8453","1"]});assert.equal(setup.autonomyMode,"autonomous");assert.equal(setup.dailyCapUsd,25)});
test("default setup enables every stable KeeperHub EVM chain",()=>{const setup=validateAgentSetup({});assert.deepEqual(setup.allowedChains,["1","8453","42161","10","137","56","43114","130"])});
test("testnet mode exposes only Sepolia networks and their faucets",()=>{assert.deepEqual(chainsForEnvironment("testnet").map(chain=>chain.id),["11155111","84532"]);assert.match(faucetForChain("11155111")!,/sepolia/i);assert.match(faucetForChain("84532")!,/base/i);assert.equal(inferChainEnvironment(["84532"]),"testnet")});

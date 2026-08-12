import assert from "node:assert/strict";
import test from "node:test";
import { createNaturalLanguageRouter } from "../lib/llm/router.ts";

test("natural language router converts interpreted trade to deterministic grammar",async()=>{const router=createNaturalLanguageRouter({client:{async interpret(){return{kind:"interpreted" as const,value:{intent:"trade" as const,amount:"0.001",tokenIn:"ETH",tokenOut:"USDC",chain:"base",reply:"Preparing it."}}}}});const result=await router.route({text:"move a tiny amount to dollars",memory:[],agent:{name:"Auctor",autonomyMode:"manual",dailyCapUsd:"5"}});assert.deepEqual(result,{text:"swap 0.001 ETH to USDC on base",reply:"Preparing it.",source:"llm"})});
test("natural language router falls back to original text when LLM is unavailable",async()=>{const router=createNaturalLanguageRouter({client:{async interpret(){return{kind:"unavailable" as const,reason:"provider_unavailable"}}}});assert.deepEqual(await router.route({text:"hello",memory:[],agent:{name:"Auctor",autonomyMode:"manual",dailyCapUsd:"5"}}),{text:"hello",source:"fallback"})});

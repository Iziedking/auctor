import assert from "node:assert/strict";
import test from "node:test";
import { buildTradeRequest, classifyChat, createChatPipeline, createChatSession } from "../lib/chat/pipeline.ts";

test("chat prefilter handles greeting help and cancel without a model", () => {
  assert.deepEqual(classifyChat("  Hey there  "), { kind: "greeting" });
  assert.deepEqual(classifyChat("what can you do?"), { kind: "help" });
  assert.deepEqual(classifyChat("cancel that transaction"), { kind: "cancel" });
});
test("chat treats singular chain-specific balance questions as portfolio intent",()=>{assert.deepEqual(classifyChat("what is my balance?"),{kind:"portfolio"});assert.deepEqual(classifyChat("my base sepolia balance"),{kind:"portfolio"})});

test("chat prefilter acknowledges an explicit preference", async () => {
  const pipeline = createChatPipeline({ mode: "mock", chains: { base: "8453" }, tokens: { USDC: "0x1111111111111111111111111111111111111111", WETH: "0x2222222222222222222222222222222222222222" }, router: "0x3333333333333333333333333333333333333333" });
  assert.deepEqual(await pipeline.handle({ text: "Remember: use Base only", correlationId: "preference-1" }), { kind: "message", message: "Preference noted.", steps: ["classified", "remembered"], recalledMemory: [] });
});

test("chat classifies only the bounded swap grammar as a trade intent", () => {
  assert.deepEqual(classifyChat("swap 12.5 USDC to WETH on base"), {
    kind: "trade",
    amount: "12.5",
    tokenIn: "USDC",
    tokenOut: "WETH",
    chain: "base",
  });
  assert.deepEqual(classifyChat("ape everything into a moonshot"), {
    kind: "unknown",
    text: "ape everything into a moonshot",
  });
});

test("chat accepts natural Base Sepolia network placement", () => {
  assert.deepEqual(classifyChat("swap 0.01 base sepolia eth to usdc"), { kind:"trade", amount:"0.01", tokenIn:"ETH", tokenOut:"USDC", chain:"base-sepolia" });
});
test("chat accepts a network between the input and output tokens",()=>{assert.deepEqual(classifyChat("swap 0.01 eth on sepolia to usdc"),{kind:"trade",amount:"0.01",tokenIn:"ETH",tokenOut:"USDC",chain:"sepolia"})});

test("safe trade templates construct an execution request without model-generated calls", () => {
  const result = buildTradeRequest(
    { kind: "trade", amount: "12.5", tokenIn: "USDC", tokenOut: "WETH", chain: "base" },
    {
      correlationId: "chat-1",
      chains: { base: "8453" },
      tokens: { USDC: "0x1111111111111111111111111111111111111111", WETH: "0x2222222222222222222222222222222222222222" },
      router: "0x3333333333333333333333333333333333333333",
    },
  );
  assert.equal(result.kind, "request");
  if (result.kind === "request") {
    assert.equal(result.request.chainId, "8453");
    assert.equal(result.request.action.kind, "call");
    assert.equal(result.request.action.to, "0x3333333333333333333333333333333333333333");
    assert.deepEqual(JSON.parse(result.request.action.functionArgs), {
      tokenIn: "0x1111111111111111111111111111111111111111",
      tokenOut: "0x2222222222222222222222222222222222222222",
      amountIn: "12.5",
    });
  }
});

test("mock chat pipeline produces an offline preview in bounded steps", async () => {
  const pipeline = createChatPipeline({
    mode: "mock",
    chains: { base: "8453" },
    tokens: { USDC: "0x1111111111111111111111111111111111111111", WETH: "0x2222222222222222222222222222222222222222" },
    router: "0x3333333333333333333333333333333333333333",
  });
  const result = await pipeline.handle({ text: "swap 12.5 USDC to WETH on base", correlationId: "chat-2" });
  assert.equal(result.kind, "preview");
  assert.deepEqual(result.steps, ["classified", "templated", "previewed"]);
  assert.equal(result.recalledMemory.length, 0);
});
test("preview includes fixture simulation evidence and an approval gate", async () => {
  const pipeline = createChatPipeline({
    mode: "mock",
    chains: { base: "8453" },
    tokens: { USDC: "0x1111111111111111111111111111111111111111", ETH: "0x2222222222222222222222222222222222222222" },
    router: "0x3333333333333333333333333333333333333333",
    simulator: { async simulate() { return { ok: true, value: { status: "simulated", gasEstimate: "160896", wouldRevert: false } }; } },
  });
  const result = await pipeline.handle({ text: "swap 0.5 USDC to ETH on base", correlationId: "chat-sim" });
  assert.equal(result.kind, "preview");
  if (result.kind === "preview") {
    assert.equal(result.trade.amount, "0.5");
    assert.equal(result.simulation?.gasEstimate, "160896");
    assert.equal(result.approvalRequired, true);
  }
});

test("session orchestration recalls memory before producing a preview and remembers explicit decisions", async () => {
  const calls: string[] = [];
  const pipeline = createChatPipeline({
    mode: "mock",
    chains: { base: "8453" },
    tokens: { USDC: "0x1111111111111111111111111111111111111111", WETH: "0x2222222222222222222222222222222222222222" },
    router: "0x3333333333333333333333333333333333333333",
  });
  const session = createChatSession({
    pipeline,
    memory: {
      async recall() { calls.push("recall"); return { kind: "recalled", records: ["Use Base only."], truncated: false }; },
      async remember() { calls.push("remember"); return { kind: "stored", local: true, receipt: "local:1" }; },
    },
  });
  const result = await session.handle({ user: "u", passphrase: "p", folder: "project-x", text: "swap 1 USDC to WETH on base", correlationId: "chat-3" });
  assert.equal(result.kind, "preview");
  assert.deepEqual(result.recalledMemory, ["Use Base only."]);
  assert.deepEqual(calls, ["recall"]);
  assert.deepEqual(await session.rememberDecision({ user: "u", passphrase: "p", folder: "project-x", text: "User approved Base-only trading." }), { kind: "stored", local: true, receipt: "local:1" });
  assert.deepEqual(calls, ["recall", "remember"]);
});

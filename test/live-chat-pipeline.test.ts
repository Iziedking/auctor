import assert from "node:assert/strict";
import test from "node:test";
import { createLiveChatPipeline } from "../lib/chat/live-pipeline.ts";

const wallet = "0xeDd7A8cdE35Dd2d30d821861e52bF9329c165386" as const;
const simulations = [
  { status: "simulated" as const, gasEstimate: "143469", simulatedReturnValue: "187307", wouldRevert: false },
  { status: "simulated" as const, gasEstimate: "143500", simulatedReturnValue: "187300", wouldRevert: false },
];

test("live chat builds and twice simulates a bounded Base ETH to USDC swap", async () => {
  const requests: unknown[] = [];
  const pipeline = createLiveChatPipeline({ walletAddress: wallet, simulator: { async simulate(request) { requests.push(request); return { ok: true as const, value: simulations.shift()! }; } } });
  const result = await pipeline.handle({ text: "swap 0.0001 ETH to USDC on base", correlationId: "live-1" });
  assert.equal(result.kind, "preview");
  assert.equal(requests.length, 2);
  if (result.kind !== "preview" || result.request.action.kind !== "call") return;
  assert.equal(result.request.action.functionName, "exactInputSingle");
  assert.equal(result.request.action.value, "0.0001");
  const [params] = JSON.parse(result.request.action.functionArgs);
  assert.equal(params.amountIn, "100000000000000");
  assert.equal(params.amountOutMinimum, "185433");
  assert.equal(params.recipient, wallet);
  assert.equal(result.simulation?.gasEstimate, "143500");
});

test("live chat refuses unsupported pairs before KeeperHub", async () => {
  let calls = 0;
  const pipeline = createLiveChatPipeline({ walletAddress: wallet, simulator: { async simulate() { calls += 1; return { ok: true as const, value: simulations[0]! }; } } });
  const result = await pipeline.handle({ text: "swap 1 USDC to ETH on base", correlationId: "live-2" });
  assert.equal(result.kind, "refused");
  assert.equal(calls, 0);
});
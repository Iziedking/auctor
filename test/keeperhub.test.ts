import assert from "node:assert/strict";
import test from "node:test";
import { createKeeperHubClient } from "../lib/keeperhub/client.ts";
import type { ExecutionRequest } from "../lib/keeperhub/types.ts";
import { createMockKeeperHubClient } from "../lib/keeperhub/mock.ts";

const request: ExecutionRequest = {
  correlationId: "swap-1",
  chainId: "8453",
  action: {
    kind: "call",
    to: "0x2626664c2603336E57B271c5C0b26F421741e481",
    functionName: "exactInputSingle",
    functionArgs: "[]",
    abi: "[]",
    value: "0.001",
  },
  privateRouting: false,
  maxGasUsd: 1,
};

test("private routing is refused before a network call", async () => {
  let calls = 0;
  const client = createKeeperHubClient({
    baseUrl: "https://example.test",
    apiKey: "kh_test",
    fetch: async () => { calls += 1; return new Response(); },
  });
  const result = await client.simulate({ ...request, privateRouting: true });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "private_routing_unsupported");
  assert.equal(calls, 0);
});

test("execute refuses a request that has not passed simulation", async () => {
  const client = createKeeperHubClient({
    baseUrl: "https://example.test",
    apiKey: "kh_test",
    fetch: async () => new Response(JSON.stringify({ executionId: "direct_1", status: "completed" }), { status: 202 }),
  });
  const result = await client.execute(request);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "simulation_required");
});

test("simulation retries one transient failure and validates the response", async () => {
  let calls = 0;
  const client = createKeeperHubClient({
    baseUrl: "https://example.test",
    apiKey: "kh_test",
    sleep: async () => undefined,
    fetch: async () => {
      calls += 1;
      if (calls === 1) return new Response("unavailable", { status: 503 });
      return new Response(JSON.stringify({ success: true, status: "simulated", gasEstimate: "160896", wouldRevert: false }), { status: 200 });
    },
  });
  const result = await client.simulate(request);
  assert.equal(result.ok, true);
  assert.equal(calls, 2);
  if (result.ok) assert.equal(result.value.wouldRevert, false);
});

test("contract-call sends payable value as a JSON number",async()=>{let payload:any;const client=createKeeperHubClient({baseUrl:"https://example.test",apiKey:"kh_test",fetch:async(_url,init)=>{payload=JSON.parse(String(init?.body));return new Response(JSON.stringify({status:"simulated",gasEstimate:"1",wouldRevert:false}),{status:200})}});const result=await client.simulate(request);assert.equal(result.ok,true);assert.equal(payload.value,0.001);assert.equal(typeof payload.value,"number")});

test("completed status fails closed when a receipt is not verified", async () => {
  const client = createKeeperHubClient({
    baseUrl: "https://example.test",
    apiKey: "kh_test",
    fetch: async () => new Response(JSON.stringify({
      executionId: "direct_1",
      status: "completed",
      sponsored: true,
      receipts: [{ hash: "0xabc", chainId: 8453, verified: false, receiptStatus: "timeout" }],
    }), { status: 200 }),
  });
  const result = await client.status("direct_1");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "receipt_unverified");
});

test("mock mode replays the verified P0 execution fixture", async () => {
  const client = createMockKeeperHubClient();
  const simulation = await client.simulate(request);
  assert.equal(simulation.ok, true);
  const submitted = await client.execute(request);
  assert.equal(submitted.ok, true);
  if (!submitted.ok) return;
  const status = await client.status(submitted.value.executionId);
  assert.equal(status.ok, true);
  if (status.ok) {
    assert.equal(status.value.sponsored, true);
    assert.equal(status.value.receipts[0]?.verified, true);
    assert.equal(status.value.transactionHash, "0x19e16696bf6172c5f232d1d11465f921380650cf3c870504d84e3114e9b30893");
  }
});

test("malformed simulation payload is rejected at the boundary", async () => {
  const client = createKeeperHubClient({
    baseUrl: "https://example.test",
    apiKey: "kh_test",
    fetch: async () => new Response(JSON.stringify({ success: true, status: "simulated", gasEstimate: 160896, wouldRevert: false }), { status: 200 }),
  });
  const result = await client.simulate(request);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "invalid_response");
});

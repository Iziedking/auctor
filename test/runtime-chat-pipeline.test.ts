import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeChatPipeline } from "../lib/chat/runtime-pipeline.ts";
import type { KeeperHubClient } from "../lib/keeperhub/types.ts";
const walletAddress = "0xeDd7A8cdE35Dd2d30d821861e52bF9329c165386" as const;
test("live runtime chat uses the real KeeperHub client factory", async () => {
  let realClients = 0; let mockClients = 0;
  const simulator = { async simulate() { return { ok: true as const, value: { status: "simulated" as const, gasEstimate: "1", simulatedReturnValue: "100", wouldRevert: false } }; } };
  const pipeline = createRuntimeChatPipeline({ mockMode: false, keeperhub: { baseUrl: "https://keeperhub.example", apiKey: "secret", walletAddress } }, { createLiveClient() { realClients += 1; return simulator as unknown as KeeperHubClient; }, createMockClient() { mockClients += 1; return simulator as unknown as KeeperHubClient; } });
  const result = await pipeline.handle({ text: "swap 0.0001 ETH to USDC on base", correlationId: "preview-1" });
  assert.equal(result.kind, "preview"); assert.equal(realClients, 1); assert.equal(mockClients, 0);
});
test("live runtime chat fails closed when its wallet is not configured", () => { assert.throws(() => createRuntimeChatPipeline({ mockMode: false, keeperhub: { baseUrl: "https://keeperhub.example", apiKey: "secret", walletAddress: null } }), /KEEPERHUB_WALLET_ADDRESS/); });
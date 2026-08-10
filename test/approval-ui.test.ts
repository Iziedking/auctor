import assert from "node:assert/strict";
import test from "node:test";
import { isCapturedMockApprovalPreview } from "../lib/chat/approval-ui.ts";

test("approval control accepts only the captured Base fixture preview", () => {
  const preview = { kind: "preview", approvalRequired: true, request: { chainId: "8453" }, trade: { amount: "0.001", tokenIn: "ETH", tokenOut: "USDC", chain: "base" } };
  assert.equal(isCapturedMockApprovalPreview(preview), true);
  assert.equal(isCapturedMockApprovalPreview({ ...preview, trade: { ...preview.trade, amount: "0.002" } }), false);
  assert.equal(isCapturedMockApprovalPreview({ ...preview, trade: { ...preview.trade, tokenOut: "WETH" } }), false);
  assert.equal(isCapturedMockApprovalPreview({ ...preview, request: { chainId: "1" } }), false);
});

import { test, expect } from "@playwright/test";

const preview = {
  kind: "preview",
  approvalRequired: true,
  trade: { amount: "0.001", tokenIn: "ETH", tokenOut: "USDC", chain: "base" },
  request: { chainId: "8453", action: { functionName: "exactInputSingle", to: "0xrouter" } },
  simulation: { gasEstimate: "184321", wouldRevert: false },
  recalledMemory: ["Use Base only."],
  checks: ["simulation_passed", "approval_required"],
};

test("chat keeps fixture approval disabled when health says unavailable", async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { execution: "mock", memory: { state: "disabled" }, approval: { mode: "fixture", available: false } } }));
  await page.route("**/api/chat", (route) => route.fulfill({ json: preview }));
  await page.goto("/chat");
  await page.getByRole("textbox", { name: "What should your agent do?" }).fill("swap 0.001 ETH to USDC on base");
  await page.getByRole("button", { name: "Send to Auctor" }).click();
  await expect(page.getByText("ACTION PREVIEW", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve and execute" })).toBeDisabled();
  await expect(page.getByText(/Execution is temporarily unavailable/)).toBeVisible();
});

test("chat submits the exact supported fixture approval and shows its audit", async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { execution: "mock", memory: { state: "available" }, approval: { mode: "fixture", available: true } } }));
  await page.route("**/api/chat", (route) => route.fulfill({ json: preview }));
  await page.route("**/api/chat/approve", async (route) => {
    const body = route.request().postDataJSON() as { text: string; recalledMemory: string[] };
    expect(body.text).toBe("swap 0.001 ETH to USDC on base");
    expect(body.recalledMemory).toEqual(["Use Base only."]);
    await route.fulfill({ json: { kind: "executed", audit: { id: "audit-fixture-1", status: "confirmed" } } });
  });
  await page.goto("/chat");
  await page.getByRole("textbox", { name: "What should your agent do?" }).fill("swap 0.001 ETH to USDC on base");
  await page.getByRole("button", { name: "Send to Auctor" }).click();
  await page.getByRole("button", { name: "Approve and execute" }).click();
  await expect(page.getByText(/Audit audit-fixture-1/)).toBeVisible();
});

test("chat does not render approval for an unsupported pair", async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { execution: "mock", memory: { state: "disabled" }, approval: { mode: "fixture", available: true } } }));
  await page.route("**/api/chat", (route) => route.fulfill({ json: { kind:"refused",reason:"chain or token is not configured",recalledMemory:[],steps:["classified","refused"] } }));
  await page.goto("/chat");
  await page.getByRole("textbox", { name: "What should your agent do?" }).fill("swap 0.001 ETH to WETH on base");
  await page.getByRole("button", { name: "Send to Auctor" }).click();
  await expect(page.getByRole("button", { name: "Approve and execute" })).toBeHidden();
});

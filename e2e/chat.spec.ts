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
  await page.getByRole("textbox", { name: "COMMAND" }).fill("swap 0.001 ETH to USDC on base");
  await page.getByRole("button", { name: "RUN PREVIEW" }).click();
  await expect(page.getByText("CAPTURED MOCK TRADE", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "APPROVE FIXTURE EXECUTION" })).toBeDisabled();
  await expect(page.getByText("Unavailable until mock mode, Postgres, and AUCTOR_AGENT_ID are configured.")).toBeVisible();
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
  await page.getByRole("textbox", { name: "COMMAND" }).fill("swap 0.001 ETH to USDC on base");
  await page.getByRole("button", { name: "RUN PREVIEW" }).click();
  await page.getByRole("button", { name: "APPROVE FIXTURE EXECUTION" }).click();
  await expect(page.getByText("Audit audit-fixture-1: confirmed", { exact: true })).toBeVisible();
});

test("chat does not render approval for an unsupported pair", async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { execution: "mock", memory: { state: "disabled" }, approval: { mode: "fixture", available: true } } }));
  await page.route("**/api/chat", (route) => route.fulfill({ json: { ...preview, trade: { ...preview.trade, tokenOut: "WETH" } } }));
  await page.goto("/chat");
  await page.getByRole("textbox", { name: "COMMAND" }).fill("swap 0.001 ETH to WETH on base");
  await page.getByRole("button", { name: "RUN PREVIEW" }).click();
  await expect(page.getByText("CAPTURED MOCK TRADE", { exact: true })).toBeHidden();
});

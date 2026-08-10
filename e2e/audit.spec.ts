import { test, expect } from "@playwright/test";

test("audit renders the evidence dossier system", async ({ page }, testInfo) => {
  await page.goto("/audit?id=confirmed-base-swap");
  await expect(page.getByLabel("Command rail")).toBeVisible();
  await expect(page.getByLabel("Evidence dossier")).toBeVisible();
  await expect(page.getByLabel("Telemetry")).toBeVisible();
  await expect(page.getByLabel("Provenance inspector")).toBeVisible();
  await expect(page.getByText("INTENT", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("POLICY", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("RECEIPT VERIFIED", { exact: true }).first()).toBeVisible();
  if (testInfo.project.name === "desktop") await expect(page.getByLabel("Case register")).toBeVisible();
  const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(size.scroll).toBeLessThanOrEqual(size.client);
});

test("refusal preserves its exact policy evidence", async ({ page }) => {
  await page.goto("/audit?id=refused-over-cap");
  await expect(page.getByText("POLICY REFUSAL", { exact: true })).toBeVisible();
  await expect(page.getByText("trade_cap_exceeded", { exact: true })).toBeVisible();
  await expect(page.getByText("FAILED", { exact: true }).first()).toBeVisible();
});

test("mobile dossier stays bounded and supports case switching", async ({ page }) => {
  for (const width of [320, 344, 390, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/audit");
    await expect(page.getByLabel("Case register")).toBeVisible();
    await expect(page.getByLabel("Evidence dossier")).toBeHidden();
    await page.getByLabel("Case register").getByRole("link").first().click();
    await expect(page.getByLabel("Evidence dossier")).toBeVisible();
    await expect(page.getByText("← BACK TO CASE REGISTER", { exact: true })).toBeVisible();
    const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);
  }
});

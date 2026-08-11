# Auctor Authentication Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `auctor.space` open with a branded session loader and a wallet-or-email login gateway, while rendering the product rail only for authenticated sessions.

**Architecture:** Keep the root layout public and move product pages beneath an authenticated route-group layout that resolves the session server-side. A small public gateway client owns session loading and login state; transport parsing and safe redirect validation live in framework-independent modules with unit tests.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.9, Node test runner, Playwright, PostgreSQL/Drizzle, EIP-1193, KeeperHub SIWE.

---

## File map

- Create `lib/auth/http-json.ts`: parse authentication responses without leaking raw JSON/parser errors.
- Create `lib/auth/redirect.ts`: allowlist post-authentication destinations.
- Create `lib/auth/server-session.ts`: resolve or require the current database-backed session on the server.
- Create `components/auth/brand-loader.tsx`: presentation-only branded loading screen.
- Create `components/auth/login-card.tsx`: wallet and email authentication UI.
- Create `components/auth/public-gateway.tsx`: session-resolution and navigation coordinator.
- Create `app/(authenticated)/layout.tsx`: server-side authentication boundary and product shell.
- Move `app/agent`, `app/chat`, and `app/audit` into `app/(authenticated)/` without changing URLs.
- Modify `app/layout.tsx`: remove the unconditional product shell.
- Modify `app/page.tsx`: render the public gateway instead of redirecting to Audit.
- Modify `lib/auth/wallet-client.ts`: use robust response parsing and stable wallet errors.
- Modify email auth service/routes: preserve a validated post-login destination.
- Modify `app/globals.css`: add loader/login styles and reduced-motion/mobile behavior.
- Add unit and Playwright coverage in `test/` and `e2e/auth-gateway.spec.ts`.

### Task 1: Safe authentication response parsing

**Files:**
- Create: `lib/auth/http-json.ts`
- Modify: `lib/auth/wallet-client.ts`
- Test: `test/auth-http-json.test.ts`
- Modify: `test/run.ts`

- [ ] **Step 1: Write failing parser tests**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { readAuthJson } from "../lib/auth/http-json.ts";

test("auth JSON parser returns structured JSON", async () => {
  assert.deepEqual(await readAuthJson(Response.json({ authenticated: true })), { authenticated: true });
});

test("auth JSON parser replaces empty and HTML responses with stable errors", async () => {
  await assert.rejects(() => readAuthJson(new Response("", { status: 502 })), /temporarily unavailable/i);
  await assert.rejects(() => readAuthJson(new Response("<html>bad gateway</html>", { status: 502, headers: { "content-type": "text/html" } })), /temporarily unavailable/i);
});

test("auth JSON parser preserves a structured API error", async () => {
  await assert.rejects(() => readAuthJson(Response.json({ error: "signature_verification_failed" }, { status: 401 })), /signature could not be verified/i);
});
```

- [ ] **Step 2: Run the suite and verify RED**

Run: `npm test`

Expected: FAIL because `lib/auth/http-json.ts` does not exist.

- [ ] **Step 3: Implement the parser**

```ts
const messages: Record<string, string> = {
  signature_verification_failed: "Your wallet signature could not be verified. Please try again.",
  keeperhub_nonce_failed: "Wallet sign-in is temporarily unavailable. Please try again.",
};

export async function readAuthJson(response: Response): Promise<unknown> {
  const text = await response.text();
  let body: unknown = null;
  if (text.trim()) {
    try { body = JSON.parse(text); }
    catch { throw new Error("Sign-in is temporarily unavailable. Please try again."); }
  }
  if (!response.ok) {
    const code = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "";
    throw new Error(messages[code] ?? "Sign-in is temporarily unavailable. Please try again.");
  }
  if (body === null) throw new Error("Sign-in is temporarily unavailable. Please try again.");
  return body;
}
```

Update `postJson` in `lib/auth/wallet-client.ts` to call `readAuthJson(response)` and remove its direct `response.json()` call.

- [ ] **Step 4: Verify GREEN**

Run: `npm test && npm run typecheck`

Expected: all tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/http-json.ts lib/auth/wallet-client.ts test/auth-http-json.test.ts test/run.ts
git commit -m "fix: harden authentication response parsing"
```

### Task 2: Safe post-authentication destinations

**Files:**
- Create: `lib/auth/redirect.ts`
- Test: `test/auth-redirect.test.ts`
- Modify: `test/run.ts`

- [ ] **Step 1: Write the failing redirect tests**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNextPath } from "../lib/auth/redirect.ts";

test("safe next accepts only authenticated product paths", () => {
  assert.equal(safeNextPath("/agent"), "/agent");
  assert.equal(safeNextPath("/chat?conversation=abc"), "/chat?conversation=abc");
  assert.equal(safeNextPath("/audit?id=case-1"), "/audit?id=case-1");
});

test("safe next rejects external and unknown paths", () => {
  for (const value of [null, "https://evil.example", "//evil.example", "/api/health", "/unknown"]) assert.equal(safeNextPath(value), "/agent");
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test`

Expected: FAIL because `safeNextPath` is missing.

- [ ] **Step 3: Implement the allowlist**

```ts
const allowed = new Set(["/agent", "/chat", "/audit"]);
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/agent";
  try {
    const url = new URL(value, "https://auctor.space");
    return url.origin === "https://auctor.space" && allowed.has(url.pathname) ? `${url.pathname}${url.search}` : "/agent";
  } catch { return "/agent"; }
}
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test && npm run typecheck`

```bash
git add lib/auth/redirect.ts test/auth-redirect.test.ts test/run.ts
git commit -m "feat: validate post-authentication redirects"
```

### Task 3: Server-enforced authenticated shell

**Files:**
- Create: `lib/auth/server-session.ts`
- Create: `app/(authenticated)/layout.tsx`
- Modify: `app/layout.tsx`
- Move: `app/agent/page.tsx` to `app/(authenticated)/agent/page.tsx`
- Move: `app/chat/*` to `app/(authenticated)/chat/*`
- Move: `app/audit/*` to `app/(authenticated)/audit/*`
- Test: `test/authenticated-shell.test.ts`
- Modify: `test/run.ts`

- [ ] **Step 1: Write a failing structural boundary test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
test("only the authenticated route group renders the command rail", async () => {
  assert.doesNotMatch(await read("app/layout.tsx"), /AppShell/);
  assert.match(await read("app/(authenticated)/layout.tsx"), /requireServerSession/);
  assert.match(await read("app/(authenticated)/layout.tsx"), /AppShell/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test`

Expected: FAIL because the authenticated layout does not exist and root still imports `AppShell`.

- [ ] **Step 3: Add the server session boundary**

`lib/auth/server-session.ts` must load config, read `auctor_session`, resolve its hash through `resolveSession`, close the database in `finally`, and return `null` for missing, expired, or unavailable sessions. Export `requireServerSession(nextPath)` that redirects to `/?next=${encodeURIComponent(safeNextPath(nextPath))}` when resolution fails.

Create the route-group layout:

```tsx
import { AppShell } from "../../components/app-shell";
import { requireServerSession } from "../../lib/auth/server-session";
export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  await requireServerSession("/agent");
  return <AppShell>{children}</AppShell>;
}
```

Change `app/layout.tsx` body to `{children}` only, then move the page directories with `git mv`. Adjust relative imports after each move.

- [ ] **Step 4: Verify route compilation**

Run: `npm test && npm run typecheck && npm run build`

Expected: tests pass; build lists `/agent`, `/chat`, and `/audit` at their unchanged public paths.

- [ ] **Step 5: Commit**

```bash
git add app lib/auth/server-session.ts test/authenticated-shell.test.ts test/run.ts
git commit -m "feat: protect the authenticated product shell"
```

### Task 4: Public brand loader and login card

**Files:**
- Create: `components/auth/brand-loader.tsx`
- Create: `components/auth/login-card.tsx`
- Create: `components/auth/public-gateway.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Test: `test/public-gateway.test.ts`
- Modify: `test/run.ts`

- [ ] **Step 1: Write failing public gateway source tests**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
test("the public gateway contains wallet and email entry without telemetry", async () => {
  const gateway = await read("components/auth/login-card.tsx");
  assert.match(gateway, /Continue with wallet/);
  assert.match(gateway, /Email me a sign-in link/);
  assert.doesNotMatch(gateway, /SYSTEM \/ LIVE|AUDIT|MEMORY/);
});
test("the root page renders the public gateway instead of redirecting to Audit", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /PublicGateway/);
  assert.doesNotMatch(page, /redirect\("\/audit"\)/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm test`

Expected: FAIL because the auth components do not exist.

- [ ] **Step 3: Implement the presentation components**

`BrandLoader` renders `AuctorLockup` inside `<div className="brandLoader" role="status" aria-label="Loading Auctor">`.

`LoginCard` receives `onWallet`, `onEmail`, `busy`, `status`, and `emailSent`; it renders the approved heading, wallet button, divider, email form, safety copy, and `<p className="authStatus" aria-live="polite">`.

`PublicGateway` starts in `checking`, requests `/backend/api/auth/session`, calls `router.replace(safeNextPath(searchParams.get("next")))` for authenticated sessions, and otherwise displays `LoginCard`. Session network failures must fall back to login without rendering the product shell.

Add graphite full-screen loader styles, centered ivory card styles, responsive spacing, visible focus states, and:

```css
@media (prefers-reduced-motion: reduce){.brandLoader .auctorMark,.brandLoader .auctorWordmark{animation:none}}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm test && npm run typecheck && npm run build`

Expected: all commands exit 0 and `/` is listed as a public page.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/globals.css components/auth test/public-gateway.test.ts test/run.ts
git commit -m "feat: add branded authentication gateway"
```

### Task 5: Wallet and email onboarding orchestration

**Files:**
- Modify: `components/auth/public-gateway.tsx`
- Modify: `lib/auth/service.ts`
- Modify: `app/api/auth/email/request/route.ts`
- Modify: `app/api/auth/email/verify/route.ts`
- Modify: `test/auth-service.test.ts`
- Create: `test/auth-email-routes.test.ts`
- Modify: `test/run.ts`

- [ ] **Step 1: Write failing destination-preservation tests**

Extend the auth-service test to request sign-in with `/chat` and assert the captured URL includes `next=%2Fchat`. Add route-helper tests proving `/api/auth/email/verify?token=...&next=%2Fchat` redirects to `/chat`, while `next=https://evil.example` redirects to `/agent`.

- [ ] **Step 2: Run and verify RED**

Run: `npm test`

Expected: FAIL because email authentication does not preserve `next`.

- [ ] **Step 3: Implement both login actions**

Update `requestSignIn(email, nextPath = "/agent")` to add `safeNextPath(nextPath)` to the verification URL. The email request route accepts `{ email, next }`; the verification route reads `next` and redirects to `new URL(safeNextPath(next), config.app.publicUrl)`.

In `PublicGateway`, wallet login calls `connectWalletWithSiwe({ provider: window.ethereum })`, then `router.replace(nextPath)` and `router.refresh()`. Email login posts `{ email, next: nextPath }` through `readAuthJson`; on `{ accepted: true }`, switch the card to the inbox confirmation state.

Map EIP-1193 rejection code `4001` to `Wallet sign-in was cancelled. You can try again when ready.` and expose explicit button labels for connecting, signing, and verifying through an optional progress callback in `connectWalletWithSiwe`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test && npm run typecheck && npm run build`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/auth/public-gateway.tsx lib/auth app/api/auth/email test
git commit -m "feat: complete wallet and email onboarding"
```

### Task 6: Browser coverage for unauthenticated and authenticated routing

**Files:**
- Create: `e2e/auth-gateway.spec.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Write the failing browser tests**

Cover these cases with route interception:

```ts
test("public entry shows login without the command rail", async ({ page }) => {
  await page.route("**/api/auth/session", route => route.fulfill({ status: 401, json: { authenticated: false } }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Continue with wallet" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Command rail" })).toHaveCount(0);
});
```

Add tests for injected-provider wallet success, code-4001 cancellation, email acceptance, authenticated session redirect, and a 390px viewport with no horizontal overflow.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:e2e -- e2e/auth-gateway.spec.ts`

Expected: one or more tests fail until the gateway behavior is complete.

- [ ] **Step 3: Make only browser-observed corrections**

Adjust selectors, ARIA labels, router refresh timing, or responsive CSS only where the failing browser test demonstrates a mismatch. Do not change authentication semantics in this task.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test:e2e -- e2e/auth-gateway.spec.ts`

Expected: all authentication gateway browser tests pass in desktop and mobile projects.

- [ ] **Step 5: Commit**

```bash
git add e2e/auth-gateway.spec.ts playwright.config.ts app/globals.css components/auth
git commit -m "test: cover authentication gateway journeys"
```

### Task 7: Canonical domain and production smoke checks

**Files:**
- Modify: `next.config.ts`
- Modify: `app/layout.tsx`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `.github/workflows/deploy.yml`
- Create: `scripts/smoke-auth-gateway.mjs`

- [ ] **Step 1: Add a failing smoke script locally**

The script accepts `AUCTOR_PUBLIC_URL`, fetches `/`, requires status 200 and the heading `Your onchain agent starts here`, fetches `/api/health`, and fails if the public HTML contains `SYSTEM / LIVE` before authentication. Run it against the current deployment and record the expected failure before changing routing.

- [ ] **Step 2: Align canonical configuration**

Set metadata base and documented `AUCTOR_PUBLIC_URL` to `https://auctor.space`. Add host redirects in `next.config.ts` only if the current ingress does not already own them. Preserve the `/backend/:path*` proxy to `https://api.auctor.space/:path*`.

- [ ] **Step 3: Add the release smoke step**

After the existing health check in `.github/workflows/deploy.yml`, run:

```bash
AUCTOR_PUBLIC_URL=https://auctor.space node scripts/smoke-auth-gateway.mjs
```

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
git diff --check
```

Expected: 0 test failures, typecheck/build exit 0, Playwright desktop/mobile pass, and no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts app/layout.tsx .env.example README.md .github/workflows/deploy.yml scripts/smoke-auth-gateway.mjs
git commit -m "chore: verify the public authentication gateway"
```

### Task 8: Production rollout verification

**Files:** None.

- [ ] **Step 1: Push the completed branch**

```bash
git push origin main
```

- [ ] **Step 2: Watch deployment**

```bash
gh run watch
```

Expected: CI, image publication, migration, deployment health, and public gateway smoke checks succeed.

- [ ] **Step 3: Verify canonical routing**

```bash
curl -I https://www.auctor.space/
curl -I https://auctor.space/
curl -fsS https://api.auctor.space/api/health
```

Expected: `www` redirects to apex, apex returns 200, and API health reports `status: ok`.

- [ ] **Step 4: Perform interactive production acceptance**

In a private browser window, verify loader to login transition, absence of the rail before login, wallet cancellation, successful SIWE sign-in, email link delivery, refresh persistence, protected-route redirect, mobile layout, and no raw parser messages.

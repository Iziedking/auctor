import assert from "node:assert/strict";
import { test } from "node:test";
import { connectWalletWithSiwe, type Eip1193Provider } from "../lib/auth/wallet-client.ts";

test("wallet sign-in connects through EIP-1193 and submits the signed SIWE message", async () => {
  const requests: Array<{ method: string; params?: readonly unknown[] }> = [];
  const provider: Eip1193Provider = {
    async request(input) {
      requests.push(input);
      if (input.method === "eth_requestAccounts") return ["0x0000000000000000000000000000000000000001"];
      if (input.method === "eth_chainId") return "0x2105";
      if (input.method === "personal_sign") return "0xsigned";
      throw new Error(`Unexpected method: ${input.method}`);
    },
  };
  const calls: Array<{ url: string; body: unknown }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body));
    calls.push({ url, body });
    if (url.endsWith("/challenge")) return Response.json({ message: "Sign in to Auctor", nonce: "nonce" });
    return Response.json({ authenticated: true, walletReady: true });
  };

  const result = await connectWalletWithSiwe({ provider, fetcher });

  assert.deepEqual(requests, [
    { method: "eth_requestAccounts" },
    { method: "eth_chainId" },
    { method: "personal_sign", params: ["Sign in to Auctor", "0x0000000000000000000000000000000000000001"] },
  ]);
  assert.deepEqual(calls, [
    { url: "/backend/api/auth/siwe/challenge", body: { walletAddress: "0x0000000000000000000000000000000000000001", chainId: 8453 } },
    { url: "/backend/api/auth/siwe/verify", body: { message: "Sign in to Auctor", signature: "0xsigned", walletAddress: "0x0000000000000000000000000000000000000001", chainId: 8453 } },
  ]);
  assert.deepEqual(result, { authenticated: true, walletReady: true });
});

test("wallet sign-in reports when no injected provider is available", async () => {
  await assert.rejects(() => connectWalletWithSiwe({ provider: undefined, fetcher: fetch }), /wallet extension/i);
});

test("wallet sign-in surfaces API errors", async () => {
  const provider: Eip1193Provider = { async request({ method }) { return method === "eth_requestAccounts" ? ["0x0000000000000000000000000000000000000001"] : "0x1"; } };
  const fetcher: typeof fetch = async () => Response.json({ error: "keeperhub_nonce_failed" }, { status: 502 });
  await assert.rejects(() => connectWalletWithSiwe({ provider, fetcher }), /temporarily unavailable/i);
});

test("wallet sign-in rejects malformed wallet accounts and chain ids", async () => {
  const noAccount: Eip1193Provider = { async request() { return []; } };
  await assert.rejects(() => connectWalletWithSiwe({ provider: noAccount, fetcher: fetch }), /did not return an account/i);
  const badChain: Eip1193Provider = { async request({ method }) { return method === "eth_requestAccounts" ? ["0x0000000000000000000000000000000000000001"] : "8453"; } };
  await assert.rejects(() => connectWalletWithSiwe({ provider: badChain, fetcher: fetch }), /invalid chain id/i);
});

test("wallet sign-in rejects an empty signature", async () => {
  const provider: Eip1193Provider = { async request({ method }) { if (method === "eth_requestAccounts") return ["0x0000000000000000000000000000000000000001"]; if (method === "eth_chainId") return "0x1"; return ""; } };
  const fetcher: typeof fetch = async () => Response.json({ message: "Sign in to Auctor" });
  await assert.rejects(() => connectWalletWithSiwe({ provider, fetcher }), /did not return a signature/i);
});

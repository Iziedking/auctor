import test from "node:test";
import assert from "node:assert/strict";
import { discoverDexToken } from "../lib/research/dexscreener.ts";

test("DexScreener normalizes the highest-liquidity EVM pair", async () => {
  const result = await discoverDexToken("ANSEM", async () => new Response(JSON.stringify({ pairs: [
    { chainId: "base", baseToken: { address: "0x0000000000000000000000000000000000000001", symbol: "ANSEM", name: "Ansem" }, pairAddress: "0xp", dexId: "uniswap", priceUsd: "1.25", liquidity: { usd: 5000 }, volume: { h24: 100 }, priceChange: { h24: "2.5" }, url: "https://dexscreener.com/base/0xp" },
    { chainId: "base", baseToken: { address: "0x0000000000000000000000000000000000000001", symbol: "ANSEM", name: "Ansem" }, pairAddress: "0xp2", dexId: "aerodrome", priceUsd: "1.3", liquidity: { usd: 25000 }, volume: { h24: 800 }, priceChange: { h24: "3.5" }, url: "https://dexscreener.com/base/0xp2" },
  ] })));
  assert.equal(result?.pairAddress, "0xp2"); assert.equal(result?.executionEligible, true); assert.equal(result?.priceUsd, 1.3);
});

test("Solana evidence is research-only", async () => {
  const result = await discoverDexToken("ANSEM", async () => new Response(JSON.stringify({ pairs: [{ chainId: "solana", baseToken: { address: "So11111111111111111111111111111111111111112", symbol: "ANSEM", name: "Ansem" }, pairAddress: "p", priceUsd: "2", liquidity: { usd: 100000 }, volume: { h24: 1 }, url: "https://dexscreener.com/solana/p" }] })));
  assert.equal(result?.executionEligible, false); assert.match(result?.riskNotes.join(" ") ?? "", /V2/);
});

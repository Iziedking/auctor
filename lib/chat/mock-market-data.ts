// Fixture-backed market evidence. Source:
// fixtures/keeperhub/base-swap-execution.json, captured 2026-08-06.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TradeMarketData } from "./approved-trade.ts";

export function createMockTradeMarketData(fixturePath = resolve("fixtures/keeperhub/base-swap-execution.json")): TradeMarketData {
  const fixture: unknown = JSON.parse(readFileSync(fixturePath, "utf8").replace(/^\uFEFF/, ""));
  if (!isRecord(fixture) || !isRecord(fixture.request) || !isRecord(fixture.simulation)) throw new Error("Mock market fixture is incomplete.");
  const { request, simulation } = fixture;
  if (typeof request.amountIn !== "string" || typeof request.amountOutMinimum !== "string" || typeof request.value !== "string" || typeof simulation.simulatedReturnValue !== "string") throw new Error("Mock market fixture is incomplete.");
  const amountInValue = request.amountIn; const minimumValue = request.amountOutMinimum; const capturedAmount = request.value; const quotedValue = simulation.simulatedReturnValue;
  return { async resolve(input) {
    if (input.chainId !== "8453" || input.tokenIn !== "ETH" || input.tokenOut !== "USDC" || input.amount !== capturedAmount) throw new Error("mock_market_pair_not_available");
    const amountIn = BigInt(amountInValue); const quotedOut = BigInt(quotedValue); const minOut = BigInt(minimumValue);
    return { amountIn, availableBalance: amountIn, notionalUsdMicros: quotedOut, quotedOut, minOut };
  } };
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

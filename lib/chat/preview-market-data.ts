import type { TradeMarketData } from "./approved-trade.ts";
import type { ChatPipelineResult } from "./pipeline.ts";

type Preview = Extract<ChatPipelineResult, { kind: "preview" }>;

export function createPreviewTradeMarketData(preview: Preview): TradeMarketData {
  return {
    async resolve(input) {
      if (input.chainId !== preview.request.chainId || input.tokenIn !== preview.trade.tokenIn || input.tokenOut !== preview.trade.tokenOut || input.amount !== preview.trade.amount) throw new Error("preview_market_mismatch");
      const quoted = preview.simulation?.simulatedReturnValue;
      if (!quoted || !/^\d+$/.test(quoted)) throw new Error("preview_quote_unavailable");
      const amountIn = decimalToUnits(input.amount, 18);
      if (amountIn === null) throw new Error("preview_amount_invalid");
      const quotedOut = BigInt(quoted);
      const args = JSON.parse(preview.request.action.kind === "call" ? preview.request.action.functionArgs : "[]") as unknown;
      const minOut = readMinimumOut(args);
      return { amountIn, availableBalance: amountIn, notionalUsdMicros: quotedOut, quotedOut, minOut };
    },
  };
}

function decimalToUnits(value: string, decimals: number): bigint | null { const match=/^(\d+)(?:\.(\d+))?$/.exec(value);if(!match)return null;const fraction=match[2]??"";if(fraction.length>decimals)return null;return BigInt(match[1]!)*10n**BigInt(decimals)+BigInt((fraction+"0".repeat(decimals)).slice(0,decimals)); }
function readMinimumOut(value:unknown):bigint { if(!Array.isArray(value)||typeof value[0]!=="object"||value[0]===null||!("amountOutMinimum" in value[0])||typeof value[0].amountOutMinimum!=="string")throw new Error("preview_minimum_unavailable");return BigInt(value[0].amountOutMinimum); }

import { isAddress, isHex } from "viem";
import type { Address } from "../keeperhub/types.ts";

const NATIVE = "0x0000000000000000000000000000000000000000";
type Transaction={to:Address;from:Address;data:`0x${string}`;value:string;chainId:number;gasLimit?:string};
export type UniswapQuote={raw:Record<string,unknown>;routing:string;amountIn:string;amountOut:string;gasFeeUsd:string|null;permitData:Record<string,unknown>|null};
export type UniswapPreparedSwap={quote:UniswapQuote;approval:Transaction|null;swap:Transaction};

export function createUniswapTradingClient(input:{apiKey:string;baseUrl?:string;fetch?:typeof fetch}){
 const fetcher=input.fetch??fetch;const base=(input.baseUrl??"https://trade-api.gateway.uniswap.org/v1").replace(/\/$/,"");
 async function post(path:string,body:unknown){const response=await fetcher(base+path,{method:"POST",headers:{"content-type":"application/json","x-api-key":input.apiKey,"x-universal-router-version":"2.0"},body:JSON.stringify(body),signal:AbortSignal.timeout(20_000)});const json=await response.json() as Record<string,unknown>;if(!response.ok)throw new Error(readError(json,`uniswap_http_${response.status}`));return json}
 return{async prepareExactInput(params:{swapper:Address;tokenIn:Address;tokenOut:Address;chainId:number;amount:string;slippageTolerance:number}):Promise<UniswapPreparedSwap>{
  const approval=params.tokenIn.toLowerCase()===NATIVE?null:readTransaction((await post("/check_approval",{walletAddress:params.swapper,token:params.tokenIn,amount:params.amount,chainId:params.chainId})).approval,true);
  const raw=await post("/quote",{swapper:params.swapper,tokenIn:params.tokenIn,tokenOut:params.tokenOut,tokenInChainId:String(params.chainId),tokenOutChainId:String(params.chainId),amount:params.amount,type:"EXACT_INPUT",slippageTolerance:params.slippageTolerance,routingPreference:"BEST_PRICE",protocols:["V2","V3","V4"]});
  const quote=normalizeQuote(raw);const {permitData:discardPermit,permitTransaction:discardTransaction,...clean}=raw;void discardPermit;void discardTransaction;const swapBody:Record<string,unknown>={...clean};
  const swap=readTransaction((await post("/swap",swapBody)).swap,false);if(!swap)throw new Error("uniswap_swap_missing");if(swap.from.toLowerCase()!==params.swapper.toLowerCase()||swap.chainId!==params.chainId)throw new Error("uniswap_swap_mismatch");
  return{quote,approval,swap};
 }};
}
function normalizeQuote(raw:Record<string,unknown>):UniswapQuote{const routing=String(raw.routing??"");const quote=record(raw.quote);if(!quote)throw new Error("uniswap_quote_missing");const input=record(quote.input);const output=record(quote.output);if(!input||!output||typeof input.amount!=="string"||typeof output.amount!=="string")throw new Error("uniswap_classic_quote_required");return{raw,routing,amountIn:input.amount,amountOut:output.amount,gasFeeUsd:typeof quote.gasFeeUSD==="string"?quote.gasFeeUSD:null,permitData:record(raw.permitData)}}
function readTransaction(value:unknown,nullable:boolean):Transaction|null{if(value===null&&nullable)return null;const item=record(value);if(!item||typeof item.to!=="string"||typeof item.from!=="string"||typeof item.data!=="string"||!isAddress(item.to)||!isAddress(item.from)||!isHex(item.data)||item.data==="0x"||typeof item.chainId!=="number")throw new Error("uniswap_transaction_invalid");return{to:item.to as Address,from:item.from as Address,data:item.data as `0x${string}`,value:typeof item.value==="string"?item.value:"0",chainId:item.chainId,...(typeof item.gasLimit==="string"?{gasLimit:item.gasLimit}:{})}}
function record(value:unknown):Record<string,unknown>|null{return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:null}
function readError(value:Record<string,unknown>,fallback:string){if(value.errorCode==="APIResponseValidationError")return"uniswap_provider_response_invalid";return typeof value.detail==="string"?value.detail:typeof value.message==="string"?value.message:fallback}

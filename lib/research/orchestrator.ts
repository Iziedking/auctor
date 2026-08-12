import type { PaidFetchResult } from "./x402.ts";
export function isResearchRequest(text:string):boolean{return /\b(research|sentiment|market signal|market outlook|news|whale activity|onchain analysis)\b/i.test(text)}
export async function runPaidResearch(input:{text:string;fetchResearch(body:unknown):Promise<PaidFetchResult<unknown>>}){if(!isResearchRequest(input.text))return null;const result=await input.fetchResearch({query:input.text});return{source:"x402",paid:result.paid,priceUsd:result.priceUsd,paymentTx:result.paymentTx,refusedReason:result.refusedReason,data:result.data}}

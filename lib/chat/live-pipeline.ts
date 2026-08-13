import type { Address, ExecutionRequest, KeeperHubClient } from "../keeperhub/types.ts";
import { classifyChat, type ChatPipelineResult } from "./pipeline.ts";
import { createPublicClient, formatEther, http, parseUnits } from "viem";
import { mainnet, base, sepolia, baseSepolia } from "viem/chains";
import { createUniswapTradingClient } from "../uniswap/client.ts";
import { resolveSwapToken } from "../uniswap/token-resolver.ts";
import { uniswapSwapRequest } from "../uniswap/keeperhub-adapter.ts";

const networks={base:{chainId:"8453",weth:"0x4200000000000000000000000000000000000006",usdc:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",router:"0x2626664c2603336E57B271c5C0b26F421741e481"},sepolia:{chainId:"11155111",weth:"0xfff9976782d46cc05630d1f6ebab18b2324d6b14",usdc:"0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",router:"0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"},"base-sepolia":{chainId:"84532",weth:"0x4200000000000000000000000000000000000006",usdc:"0x036CbD53842c5426634e7929541eC2318f3dCF7c",router:"0x2626664c2603336E57B271c5C0b26F421741e481"}}as const;

export function createLiveChatPipeline(input: {
  readonly walletAddress: Address;
  readonly ownerAddress?: Address;
  readonly simulator: Pick<KeeperHubClient, "simulate">;
  readonly slippageBps?: number;
  readonly uniswap?:{readonly apiKey:string;readonly baseUrl:string};
}) {
  const slippageBps = input.slippageBps ?? 100;
  return {
    async handle(command: { readonly text: string; readonly correlationId: string; readonly recalledMemory?: readonly string[] }): Promise<ChatPipelineResult> {
      const recalledMemory = command.recalledMemory ?? [];
      const intent = classifyChat(command.text);
      if (intent.kind === "greeting") return { kind: "message", message: "Auctor is ready.", steps: ["classified"], recalledMemory };
      if (intent.kind === "help") return { kind: "message", message: "Live execution supports guarded ETH to USDC swaps on Base, Ethereum Sepolia, and Base Sepolia.", steps: ["classified"], recalledMemory };
      if (intent.kind === "cancel") return { kind: "message", message: "No transaction was submitted.", steps: ["classified", "cancelled"], recalledMemory };
      if (intent.kind === "portfolio") { const chain=portfolioChain(command.text);const balance=await createPublicClient({chain,transport:http()}).getBalance({address:input.walletAddress});const warning=balance===0n?` Funding alert: your agent wallet has zero ${chain.nativeCurrency.symbol}. Fund ${input.walletAddress} before requesting a swap.`:"";return{kind:"message",message:`Your agent wallet ${input.walletAddress} has ${formatEther(balance)} ${chain.nativeCurrency.symbol} on ${chain.name}.${warning}`,steps:["classified","portfolio","balance_read"],recalledMemory}; }
      if (intent.kind === "preference") return { kind: "message", message: "Preference noted.", steps: ["classified", "remembered"], recalledMemory };
      if(intent.kind==="withdraw"){const chain=portfolioChain(intent.chain);const destination=intent.destination.startsWith("my ")?input.ownerAddress:intent.destination as Address;if(!destination)return{kind:"refused",reason:"connected_wallet_destination_unavailable",steps:["classified","refused"],recalledMemory};const client=createPublicClient({chain,transport:http()});const balance=await client.getBalance({address:input.walletAddress});const reserve=await gasReserve(client);const amount=intent.amount==="all"?balance>reserve?balance-reserve:0n:parseUnits(intent.amount,18);if(amount<=0n||amount+reserve>balance)return{kind:"refused",reason:"insufficient_balance_after_gas_reserve",steps:["classified","balance_read","refused"],recalledMemory};const request={correlationId:command.correlationId,chainId:String(chain.id),privateRouting:false,maxGasUsd:0,action:{kind:"transfer" as const,to:destination,amount:formatEther(amount)}};const simulation=await input.simulator.simulate(request);if(!simulation.ok||simulation.value.wouldRevert)return{kind:"refused",reason:simulation.ok?simulation.value.revertReason??"simulation_would_revert":simulation.error.message,steps:["classified","balance_read","simulated","refused"],recalledMemory};return{kind:"preview",request,trade:{amount:formatEther(amount),tokenIn:"ETH",tokenOut:"ETH",chain:chain.name},simulation:simulation.value,quote:{amountIn:amount.toString(),amountOut:amount.toString(),gasFeeUsd:null},approvalRequired:true,checks:[`destination_${destination}`,`gas_reserve_${formatEther(reserve)}_ETH`,"keeperhub_simulation_passed","approval_required"],steps:["classified","balance_read","reserved_gas","simulated","previewed"],recalledMemory}}
      if (intent.kind !== "trade") return { kind: "refused", reason: "unsupported_intent", steps: ["classified", "refused"], recalledMemory };
      if(input.uniswap){try{const chainId=Number(chainIdFor(intent.chain));const [tokenIn,tokenOut]=await Promise.all([resolveSwapToken({value:intent.tokenIn,chainId}),resolveSwapToken({value:intent.tokenOut,chainId})]);const amount=parseUnits(intent.amount,tokenIn.decimals).toString();const prepared=await createUniswapTradingClient(input.uniswap).prepareExactInput({swapper:input.walletAddress,tokenIn:tokenIn.address,tokenOut:tokenOut.address,chainId,amount,slippageTolerance:slippageBps/100});if(prepared.approval)return{kind:"refused",reason:"token_approval_required_before_swap",steps:["classified","quoted","approval_required"],recalledMemory};const request=uniswapSwapRequest({prepared,correlationId:command.correlationId});const simulation=await input.simulator.simulate(request);if(!simulation.ok||simulation.value.wouldRevert)return{kind:"refused",reason:simulation.ok?simulation.value.revertReason??"simulation_would_revert":simulation.error.message,steps:["classified","quoted","simulated","refused"],recalledMemory};return{kind:"preview",request,trade:{amount:intent.amount,tokenIn:tokenIn.symbol,tokenOut:tokenOut.symbol,chain:intent.chain},simulation:simulation.value,quote:{amountIn:prepared.quote.amountIn,amountOut:prepared.quote.amountOut,gasFeeUsd:prepared.quote.gasFeeUsd},approvalRequired:true,checks:["tokens_resolved","uniswap_route","slippage_bounded","keeperhub_simulation_passed","approval_required"],steps:["classified","resolved","quoted","simulated","previewed"],recalledMemory}}catch(error){return{kind:"refused",reason:error instanceof Error?error.message:"uniswap_quote_failed",steps:["classified","refused"],recalledMemory}}}
      const network=networks[intent.chain as keyof typeof networks];if (!network || intent.tokenIn !== "ETH" || intent.tokenOut !== "USDC") return { kind: "refused", reason: "live_pair_not_supported", steps: ["classified", "refused"], recalledMemory };
      const amountIn = decimalToUnits(intent.amount, 18);
      if (amountIn === null || amountIn <= 0n) return { kind: "refused", reason: "invalid_amount", steps: ["classified", "refused"], recalledMemory };
      const quoteRequest = swapRequest(network,command.correlationId, input.walletAddress, intent.amount, amountIn, 0n);
      const quote = await input.simulator.simulate(quoteRequest);
      if (!quote.ok || quote.value.wouldRevert || !quote.value.simulatedReturnValue) return { kind: "refused", reason: quote.ok ? quote.value.revertReason ?? "simulation_quote_unavailable" : quote.error.message, steps: ["classified", "templated", "refused"], recalledMemory };
      const quotedOut = BigInt(quote.value.simulatedReturnValue);
      const minimumOut = quotedOut * BigInt(10_000 - slippageBps) / 10_000n;
      const request = swapRequest(network,command.correlationId, input.walletAddress, intent.amount, amountIn, minimumOut);
      const simulation = await input.simulator.simulate(request);
      if (!simulation.ok || simulation.value.wouldRevert) return { kind: "refused", reason: simulation.ok ? simulation.value.revertReason ?? "simulation_would_revert" : simulation.error.message, steps: ["classified", "templated", "simulated", "refused"], recalledMemory };
      return { kind: "preview", request, trade: { amount: intent.amount, tokenIn: "ETH", tokenOut: "USDC", chain: intent.chain }, simulation: simulation.value, approvalRequired: true, checks: ["chain_configured", "tokens_configured", "slippage_bounded", "simulation_passed", "approval_required"], steps: ["classified", "templated", "quoted", "simulated", "previewed"], recalledMemory };
    },
  };
}
function chainIdFor(value:string){const found:ObjectEntries=({ethereum:"1",mainnet:"1",base:"8453",arbitrum:"42161",optimism:"10",polygon:"137",bnb:"56",avalanche:"43114",unichain:"130",sepolia:"11155111","base-sepolia":"84532"} as const);const id=(found as Record<string,string>)[value];if(!id)throw new Error("uniswap_chain_unsupported");return id}
function portfolioChain(text:string){const value=text.toLowerCase();if(value.includes("base sepolia")||value.includes("testnet"))return baseSepolia;if(value.includes("sepolia"))return sepolia;if(value.includes("base"))return base;return mainnet}
async function gasReserve(client:{getGasPrice():Promise<bigint>}){return await client.getGasPrice()*30000n}
type ObjectEntries=Record<string,string>;

function swapRequest(network:(typeof networks)[keyof typeof networks],correlationId: string, recipient: Address, amount: string, amountIn: bigint, amountOutMinimum: bigint): ExecutionRequest {
  return { correlationId, chainId: network.chainId, privateRouting: false, maxGasUsd: 0, action: { kind: "call", to: network.router, functionName: "exactInputSingle", functionArgs: JSON.stringify([{ tokenIn: network.weth, tokenOut: network.usdc, fee: "500", recipient, amountIn: amountIn.toString(), amountOutMinimum: amountOutMinimum.toString(), sqrtPriceLimitX96: "0" }]), value: amount } };
}

function decimalToUnits(value: string, decimals: number): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return null;
  const fraction = match[2] ?? "";
  if (fraction.length > decimals) return null;
  return BigInt(match[1]!) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));
}

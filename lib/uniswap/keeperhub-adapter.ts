import { decodeFunctionData, formatEther, parseAbi } from "viem";
import type { ExecutionRequest } from "../keeperhub/types.ts";
import type { UniswapPreparedSwap } from "./client.ts";

const routerAbi=parseAbi(["function execute(bytes commands, bytes[] inputs, uint256 deadline) payable","function execute(bytes commands, bytes[] inputs) payable"]);
const approveAbi=parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]);

export function uniswapSwapRequest(input:{prepared:UniswapPreparedSwap;correlationId:string}):ExecutionRequest{
 const decoded=decodeFunctionData({abi:routerAbi,data:input.prepared.swap.data});
 return{correlationId:input.correlationId,chainId:String(input.prepared.swap.chainId),privateRouting:false,maxGasUsd:0,action:{kind:"call",to:input.prepared.swap.to,functionName:decoded.functionName,functionArgs:JSON.stringify(decoded.args,(_,value)=>typeof value==="bigint"?value.toString():value),abi:JSON.stringify(routerAbi),value:formatEther(BigInt(input.prepared.swap.value))}};
}
export function uniswapApprovalRequest(input:{prepared:UniswapPreparedSwap;correlationId:string}):ExecutionRequest|null{
 const approval=input.prepared.approval;if(!approval)return null;const decoded=decodeFunctionData({abi:approveAbi,data:approval.data});return{correlationId:input.correlationId,chainId:String(approval.chainId),privateRouting:false,maxGasUsd:0,action:{kind:"call",to:approval.to,functionName:decoded.functionName,functionArgs:JSON.stringify(decoded.args,(_,value)=>typeof value==="bigint"?value.toString():value),abi:JSON.stringify(approveAbi),value:approval.value}};
}

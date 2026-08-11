"use client";

import { useCallback, useEffect, useState } from "react";
import { connectWalletWithSiwe, type Eip1193Provider } from "../../lib/auth/wallet-client";
import { useAccount } from "wagmi";

type Agent = { name:string; autonomyMode:"manual"|"guarded"|"autonomous"; budgetUsd:string; dailyCapUsd:string; perTradeCapUsd:string; allowedChains:string[]; allowedTokens:string[]; maxSlippageBps:number };

function injectedProvider(): Eip1193Provider | undefined { return (window as typeof window & { ethereum?:Eip1193Provider }).ethereum; }
function errorMessage(error:unknown):string { return error instanceof Error ? error.message : "Wallet sign-in failed."; }

export function AgentSetup(){
  const { status } = useAccount();
  const[agent,setAgent]=useState<Agent|null>(null);const[message,setMessage]=useState("");const[connecting,setConnecting]=useState(false);
  const loadAgent=useCallback(async()=>{const response=await fetch("/backend/api/agent",{cache:"no-store"});if(response.ok)setAgent(await response.json());else setAgent(null)},[]);
  useEffect(()=>{void loadAgent()},[loadAgent]);
  useEffect(()=>{if(status === "disconnected"){setAgent(null);setMessage("");void fetch("/api/auth/logout",{method:"POST"})}},[status]);
  async function signIn(){setConnecting(true);setMessage("Connecting to your wallet…");try{await connectWalletWithSiwe({provider:injectedProvider()});await loadAgent();setMessage("Wallet verified. Your agent is ready.")}catch(error){setMessage(errorMessage(error))}finally{setConnecting(false)}}
  async function save(event:React.FormEvent){event.preventDefault();if(!agent)return;const response=await fetch("/backend/api/agent",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({...agent,budgetUsd:Number(agent.budgetUsd),dailyCapUsd:Number(agent.dailyCapUsd),perTradeCapUsd:Number(agent.perTradeCapUsd)})});const body=await response.json();if(response.ok){setAgent(body);setMessage("Your agent controls are saved.")}else setMessage(body.error)}
  if(!agent)return <section className="agentSetup"><p className="eyebrow">Your onchain agent</p><h1>Tell Auctor what you need done.</h1><p>Connect once. Your agent keeps the context, follows your limits, and stays available wherever you communicate.</p><div className="walletConnect"><button type="button" onClick={()=>void signIn()} disabled={connecting}>{connecting?"Check your wallet…":"Continue with wallet"}</button><small>Auctor will request your account, then ask you to sign a secure sign-in message. This does not create a transaction or cost gas.</small></div>{message&&<p role="status">{message}</p>}</section>;
  return <section className="agentSetup"><p className="eyebrow">Agent controls</p><h1>One agent. Your instructions. Your limits.</h1><form onSubmit={save}><label>Agent name<input value={agent.name} onChange={event=>setAgent({...agent,name:event.target.value})}/></label><label>How independently can Auctor act?<select value={agent.autonomyMode} onChange={event=>setAgent({...agent,autonomyMode:event.target.value as Agent["autonomyMode"]})}><option value="manual">Ask before every action</option><option value="guarded">Act within my limits</option><option value="autonomous">Run approved strategies automatically</option></select></label><div className="budgetGrid"><label>Total budget<input type="number" min="0" step="0.01" value={agent.budgetUsd} onChange={event=>setAgent({...agent,budgetUsd:event.target.value})}/></label><label>Daily limit<input type="number" min="0" step="0.01" value={agent.dailyCapUsd} onChange={event=>setAgent({...agent,dailyCapUsd:event.target.value})}/></label><label>Single action limit<input type="number" min="0" step="0.01" value={agent.perTradeCapUsd} onChange={event=>setAgent({...agent,perTradeCapUsd:event.target.value})}/></label></div><button type="submit">Save agent controls</button></form>{message&&<p role="status">{message}</p>}</section>
}

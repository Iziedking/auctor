"use client";

import { useCallback, useEffect, useState } from "react";
import { connectWalletWithSiwe, type Eip1193Provider } from "../../lib/auth/wallet-client";
import { useAccount } from "wagmi";
import { inferChainEnvironment } from "../../lib/chains";

type Agent = { name:string; autonomyMode:"manual"|"guarded"|"autonomous"; budgetUsd:string; dailyCapUsd:string; perTradeCapUsd:string; allowedChains:string[]; allowedTokens:string[]; maxSlippageBps:number };

function injectedProvider(): Eip1193Provider | undefined { return (window as typeof window & { ethereum?:Eip1193Provider }).ethereum; }
function errorMessage(error:unknown):string { return error instanceof Error ? error.message : "Wallet sign-in failed."; }

export function AgentSetup(){
  const { status } = useAccount();
  const[agent,setAgent]=useState<Agent|null>(null);const[savedAgent,setSavedAgent]=useState<Agent|null>(null);const[message,setMessage]=useState("");const[connecting,setConnecting]=useState(false);const[editing,setEditing]=useState(false);
  const loadAgent=useCallback(async()=>{const response=await fetch("/backend/api/agent",{cache:"no-store"});if(response.ok){const loaded=await response.json();setAgent(loaded);setSavedAgent(loaded)}else{setAgent(null);setSavedAgent(null)}},[]);
  useEffect(()=>{void loadAgent()},[loadAgent]);
  useEffect(()=>{if(status === "disconnected"){setAgent(null);setMessage("");void fetch("/api/auth/logout",{method:"POST"})}},[status]);
  async function signIn(){setConnecting(true);setMessage("Connecting to your wallet…");try{await connectWalletWithSiwe({provider:injectedProvider()});await loadAgent();setMessage("Wallet verified. Your agent is ready.")}catch(error){setMessage(errorMessage(error))}finally{setConnecting(false)}}
  async function save(event:React.FormEvent){event.preventDefault();if(!agent)return;const response=await fetch("/backend/api/agent",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({...agent,budgetUsd:Number(agent.budgetUsd),dailyCapUsd:Number(agent.dailyCapUsd),perTradeCapUsd:Number(agent.perTradeCapUsd)})});const body=await response.json();if(response.ok){setAgent(body);setSavedAgent(body);setEditing(false);setMessage("Your agent controls are saved and locked.")}else setMessage(body.error)}
  if(!agent)return <section className="agentSetup"><p className="eyebrow">Your onchain agent</p><h1>Tell Auctor what you need done.</h1><p>Connect once. Your agent keeps the context, follows your limits, and stays available wherever you communicate.</p><div className="walletConnect"><button type="button" onClick={()=>void signIn()} disabled={connecting}>{connecting?"Check your wallet…":"Continue with wallet"}</button><small>Auctor will request your account, then ask you to sign a secure sign-in message. This does not create a transaction or cost gas.</small></div>{message&&<p role="status">{message}</p>}</section>;
  const testnet = inferChainEnvironment(agent.allowedChains) === "testnet";const budgetUnit=testnet?"TEST UNITS":"USD";
  return <section className="agentSetup"><div className="agentSetupTitle"><div><p className="eyebrow">Agent controls</p><h1>One agent. Your instructions. Your limits.</h1></div>{!editing&&<button className="editControls" type="button" onClick={()=>setEditing(true)}>Edit controls</button>}</div><form onSubmit={save} aria-label="Agent controls"><fieldset disabled={!editing}><label>Agent name<input value={agent.name} onChange={event=>setAgent({...agent,name:event.target.value})}/></label><label>How independently can Auctor act?<select value={agent.autonomyMode} onChange={event=>setAgent({...agent,autonomyMode:event.target.value as Agent["autonomyMode"]})}><option value="manual">Ask before every action</option><option value="guarded">Act within my limits</option><option value="autonomous">Run approved strategies automatically</option></select></label><div className="budgetGrid"><BudgetField label="Total budget" unit={budgetUnit} value={agent.budgetUsd} onChange={value=>setAgent({...agent,budgetUsd:value})}/><BudgetField label="Daily limit" unit={budgetUnit} value={agent.dailyCapUsd} onChange={value=>setAgent({...agent,dailyCapUsd:value})}/><BudgetField label="Single action limit" unit={budgetUnit} value={agent.perTradeCapUsd} onChange={value=>setAgent({...agent,perTradeCapUsd:value})}/></div>{testnet&&<p className="budgetNote">Test units are policy limits only. Testnet assets do not represent real USD value.</p>}</fieldset>{editing&&<div className="controlActions"><button type="button" className="secondaryAction" onClick={()=>{setAgent(savedAgent);setEditing(false);setMessage("")}}>Cancel</button><button type="submit">Save and lock controls</button></div>}</form>{message&&<p role="status">{message}</p>}</section>
}

function BudgetField({label,unit,value,onChange}:{label:string;unit:string;value:string;onChange:(value:string)=>void}){return <label>{label}<span className="budgetInput"><input aria-label={`${label} in ${unit.toLowerCase()}`} type="number" min="0" step="0.01" value={value} onChange={event=>onChange(event.target.value)}/><span>{unit}</span></span></label>}

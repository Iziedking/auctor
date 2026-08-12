"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, WalletCards } from "lucide-react";
import { useBalance, useChainId } from "wagmi";

type AgentProfile={name:string;khWalletAddress?:string|null};
const networks:Record<number,{name:string;explorer:string;faucet:string}>={
  11155111:{name:"Ethereum Sepolia",explorer:"https://sepolia.etherscan.io/address/",faucet:"https://cloud.google.com/application/web3/faucet/ethereum/sepolia"},
  84532:{name:"Base Sepolia",explorer:"https://sepolia.basescan.org/address/",faucet:"https://www.alchemy.com/faucets/base-sepolia"},
  1:{name:"Ethereum",explorer:"https://etherscan.io/address/",faucet:""},
  8453:{name:"Base",explorer:"https://basescan.org/address/",faucet:""},
};

export function PortfolioWorkspace(){
  const chainId=useChainId();const network=networks[chainId]??networks[11155111]!;
  const[agent,setAgent]=useState<AgentProfile|null>(null);
  useEffect(()=>{void fetch("/backend/api/agent",{cache:"no-store"}).then(response=>response.ok?response.json():null).then(value=>setAgent(value as AgentProfile|null))},[]);
  const address=agent?.khWalletAddress as `0x${string}`|undefined;
  const balance=useBalance({address,chainId,query:{enabled:Boolean(address)}});
  return <section className="portfolioWorkspace">
    <header><div><p className="eyebrow">Capital view</p><h1>Portfolio</h1><p>Live read-only data for the provisioned agent wallet on the selected network.</p></div><button type="button" className="refreshPortfolio" onClick={()=>void balance.refetch()} disabled={!address||balance.isFetching}><RefreshCw/>{balance.isFetching?"Refreshing":"Refresh"}</button></header>
    <div className="portfolioSummary">
      <div><span>Agent wallet</span><b>{address?shortAddress(address):"Not provisioned"}</b>{address&&<a href={network.explorer+address} target="_blank" rel="noreferrer">View in explorer <ExternalLink/></a>}</div>
      <div><span>Network</span><b>{network.name}</b><small>Switch networks from the toolbar.</small></div>
      <div><span>Native balance</span><b>{balance.isLoading?"Loading":balance.data?`${Number(balance.data.formatted).toLocaleString(undefined,{maximumFractionDigits:6})} ${balance.data.symbol}`:"Unavailable"}</b><small>{chainId===11155111||chainId===84532?"Testnet assets have no real USD value.":"Live network balance."}</small></div>
    </div>
    {!address?<div className="portfolioEmpty"><WalletCards/><h2>Agent wallet unavailable</h2><p>Reconnect your wallet to finish KeeperHub agent provisioning.</p><a href="/agent">Open Agent controls</a></div>:balance.isError?<div className="portfolioEmpty"><WalletCards/><h2>Balance read failed</h2><p>The selected network RPC did not return the agent balance.</p><button type="button" onClick={()=>void balance.refetch()}>Try again</button></div>:<div className="assetTable"><div><span>Asset</span><span>Network</span><span>Balance</span><span>Action</span></div><div><b>{balance.data?.symbol??"Native token"}</b><span>{network.name}</span><strong>{balance.data?Number(balance.data.formatted).toLocaleString(undefined,{maximumFractionDigits:6}):"..."}</strong>{network.faucet?<a href={network.faucet} target="_blank" rel="noreferrer">Get test funds <ExternalLink/></a>:<a href={network.explorer+address} target="_blank" rel="noreferrer">Explorer <ExternalLink/></a>}</div></div>}
  </section>
}
function shortAddress(value:string){return `${value.slice(0,8)}...${value.slice(-6)}`}

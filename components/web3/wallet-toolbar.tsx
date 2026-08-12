"use client";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId, useSwitchChain } from "wagmi";
import { chainsForEnvironment, type ChainEnvironment } from "../../lib/chains";

const testIds = new Set([11155111, 84532]);
export function WalletToolbar(){
  const chainId=useChainId();const{switchChain}=useSwitchChain();const[menu,setMenu]=useState(false);const environment:ChainEnvironment=testIds.has(chainId)?"testnet":"mainnet";
  async function selectEnvironment(next:ChainEnvironment){setMenu(false);const response=await fetch("/backend/api/agent",{cache:"no-store"});if(response.ok){const agent=await response.json();await fetch("/backend/api/agent",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({...agent,budgetUsd:Number(agent.budgetUsd),dailyCapUsd:Number(agent.dailyCapUsd),perTradeCapUsd:Number(agent.perTradeCapUsd),allowedChains:chainsForEnvironment(next).map(chain=>chain.id)})})}switchChain({chainId:next==="testnet"?11155111:8453})}
  return <ConnectButton.Custom>{({account,chain,mounted,openAccountModal,openChainModal,openConnectModal})=>{
    const ready=mounted;const connected=ready&&account&&chain;
    if(!connected)return <div className="walletToolbar"><button type="button" className="connectCompact" onClick={openConnectModal}>Connect wallet</button></div>;
    return <div className="walletToolbar" aria-label="Wallet controls"><button type="button" className="walletBalance" onClick={openAccountModal}><b>{account.displayBalance??"Balance"}</b><span>{account.displayName}</span></button><button type="button" className="walletChain" onClick={openChainModal}>{chain.hasIcon&&chain.iconUrl?<img src={chain.iconUrl} alt=""/>:<span className="chainlinkMark"/>}<span>{chain.name}</span></button><div className="environmentMenu"><button type="button" className={"environmentChip "+environment} onClick={()=>setMenu(!menu)} aria-expanded={menu}><i/>{environment==="mainnet"?"Mainnet":"Testnet"}</button>{menu&&<div role="menu"><button type="button" className="mainnet" onClick={()=>void selectEnvironment("mainnet")}>Mainnet</button><button type="button" className="testnet" onClick={()=>void selectEnvironment("testnet")}>Testnet</button></div>}</div></div>}}
  </ConnectButton.Custom>
}

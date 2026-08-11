"use client";
import{useState,type ReactNode}from"react";import{QueryClient,QueryClientProvider}from"@tanstack/react-query";import{RainbowKitProvider,getDefaultConfig}from"@rainbow-me/rainbowkit";import{WagmiProvider}from"wagmi";import{base,mainnet}from"wagmi/chains";
const config=getDefaultConfig({appName:"Auctor",projectId:process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID??"auctor-walletconnect-unconfigured",chains:[base,mainnet],ssr:true});
export function Web3Providers({children}:{children:ReactNode}){const[queryClient]=useState(()=>new QueryClient());return <WagmiProvider config={config}><QueryClientProvider client={queryClient}><RainbowKitProvider modalSize="compact">{children}</RainbowKitProvider></QueryClientProvider></WagmiProvider>}

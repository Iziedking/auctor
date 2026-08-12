"use client";
import Link from"next/link";import{usePathname}from"next/navigation";import{AuctorSymbol}from"./brand/auctor-symbols";
const items=[{href:"/agent",label:"Agent",symbol:"agent"},{href:"/chat",label:"Command",symbol:"command"},{href:"/portfolio",label:"Portfolio",symbol:"portfolio"},{href:"/audit",label:"Audit trail",symbol:"audit"},{href:"/notifications",label:"Notifications",symbol:"notify"},{href:"/settings",label:"Settings",symbol:"settings"}]as const;
export function RailNav(){const pathname=usePathname();return<nav>{items.map(item=><Link key={item.label}href={item.href}className={"railLink"+(pathname.startsWith(item.href)?" active":"")}><AuctorSymbol name={item.symbol}/><span>{item.label}</span></Link>)}</nav>}

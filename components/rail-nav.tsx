"use client";
import Link from "next/link";
import { Activity, Bell, Bot, Brain, BriefcaseBusiness, ListTodo, MessageSquare, Settings, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/chat", label: "Command", icon: MessageSquare, active: true },
  { href: "/agent", label: "Agent", icon: Bot, active: true },
  { href: "/audit", label: "Audit trail", icon: Activity, active: true },
  { label: "Portfolio", icon: BriefcaseBusiness },
  { label: "Tasks", icon: ListTodo },
  { label: "Strategies", icon: Sparkles },
  { label: "Memory", icon: Brain },
  { label: "Notifications", icon: Bell },
  { label: "Settings", icon: Settings },
] as const;

export function RailNav() {
  const pathname = usePathname();
  return <nav>{items.map((item) => {
    const Icon = item.icon;
    if ("href" in item) return <Link key={item.label} href={item.href} className={"railLink" + (pathname.startsWith(item.href) ? " active" : "")}><Icon /><span>{item.label}</span></Link>;
    return <span key={item.label} className="railLink railLinkSoon" aria-disabled="true"><Icon /><span>{item.label}</span><small>Soon</small></span>;
  })}</nav>;
}

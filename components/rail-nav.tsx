"use client";
import Link from "next/link";
import { Activity, Brain, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/audit", label: "01 / AUDIT", icon: Activity },
  { href: "/chat", label: "02 / CHAT", icon: MessageSquare },
] as const;

export function RailNav() {
  const pathname = usePathname();
  return <nav>{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={"railLink" + (pathname.startsWith(href) ? " active" : "")}><Icon />{label}</Link>)}<span className="railLink"><Brain />03 / MEMORY</span></nav>;
}

"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { BrandLoader } from "./brand-loader";

export function AuthenticatedShellGuard({ children }: { children: ReactNode }) {
  const { status } = useAccount();
  const router = useRouter();
  useEffect(() => {
    if (status !== "disconnected") return;
    void fetch("/api/auth/logout", { method: "POST", keepalive: true }).finally(() => router.replace("/"));
  }, [router, status]);
  if (status === "disconnected") return <BrandLoader />;
  return <>{children}</>;
}

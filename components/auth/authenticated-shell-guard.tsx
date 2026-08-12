"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { BrandLoader } from "./brand-loader";

export function AuthenticatedShellGuard({ children }: { children: ReactNode }) {
  const { status } = useAccount();
  const router = useRouter();
  const previous = useRef<typeof status>("connecting");
  const [revoked, setRevoked] = useState(false);
  useEffect(() => {
    if (previous.current === "connected" && status === "disconnected") {
      setRevoked(true);
      void fetch("/api/auth/logout", { method: "POST", keepalive: true }).finally(() => router.replace("/"));
    }
    previous.current = status;
  }, [router, status]);
  if (revoked) return <BrandLoader />;
  return <>{children}</>;
}

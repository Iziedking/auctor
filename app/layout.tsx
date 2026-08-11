import type { Metadata, Viewport } from "next";
import "@rainbow-me/rainbowkit/styles.css";
import { Web3Providers } from "../components/web3/providers";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://auctor.space"),
  title: {
    default: "Auctor - Intelligent Capital",
    template: "%s - Auctor",
  },
  description:
    "State your intent. Auctor remembers the context, verifies the action, and keeps you in control.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      {
        url: "/favicon.ico",
        sizes: "16x16 32x32 48x48",
        type: "image/x-icon",
      },
    ],
    shortcut: "/icon.svg",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Auctor",
    title: "Auctor - Intelligent Capital",
    description: "The intelligent command layer for onchain capital.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Auctor - Intelligent Capital",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F1E8" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F0D" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Web3Providers>{children}</Web3Providers></body>
    </html>
  );
}

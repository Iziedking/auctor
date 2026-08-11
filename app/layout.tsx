import type { Metadata, Viewport } from "next";

import { AppShell } from "../components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.auctor.space"),
  title: {
    default: "Auctor - Intelligent Capital",
    template: "%s - Auctor",
  },
  description:
    "State your intent. Auctor remembers the context, verifies the action, and keeps you in control.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
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
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

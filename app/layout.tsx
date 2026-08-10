import type{Metadata}from"next";import"./globals.css";import{AppShell}from"../components/app-shell";
export const metadata:Metadata={title:"Auctor",description:"Policy-controlled agent execution with verifiable audit trails."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AppShell>{children}</AppShell></body></html>}
import "./dossier.css";
import "./shell-fixes.css";

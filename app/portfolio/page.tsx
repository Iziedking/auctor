import { AppShell } from "../../components/app-shell";import{PortfolioWorkspace}from"../../components/portfolio/portfolio-workspace";import{requireServerSession}from"../../lib/auth/server-session";
export default async function PortfolioPage(){await requireServerSession("/portfolio");return <AppShell><PortfolioWorkspace/></AppShell>}

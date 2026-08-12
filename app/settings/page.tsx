import{AppShell}from"../../components/app-shell";import{AgentSetup}from"../../components/agent/agent-setup";import{requireServerSession}from"../../lib/auth/server-session";
export default async function SettingsPage(){await requireServerSession("/settings");return <AppShell><AgentSetup/></AppShell>}

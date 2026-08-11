import { AgentSetup } from "../../components/agent/agent-setup";
import { AppShell } from "../../components/app-shell";
import { requireServerSession } from "../../lib/auth/server-session";
export default async function AgentPage(){await requireServerSession("/agent");return <AppShell><AgentSetup/></AppShell>}

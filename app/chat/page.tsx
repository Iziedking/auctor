import { ChatWorkspace } from "../../components/chat/chat-workspace";
import { AppShell } from "../../components/app-shell";
import { requireServerSession } from "../../lib/auth/server-session";
import "./chat.css";
import "./approval.css";
export default async function ChatPage(){await requireServerSession("/chat");return <AppShell><ChatWorkspace/></AppShell>}

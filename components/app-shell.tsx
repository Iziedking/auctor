import { ShieldCheck } from "lucide-react";
import { RailNav } from "./rail-nav";
export function AppShell({children}:{children:React.ReactNode}){return <div className="dossierShell"><aside className="commandRail" aria-label="Command rail"><header className="railIdentity"><ShieldCheck size={18}/><span><strong>AUCTOR</strong><small>CAPITAL OPERATIONS</small></span></header><RailNav/><footer className="railTelemetry" aria-label="Capabilities"><span>SYSTEM / LIVE</span><span>DB / READY</span><span>KEEPER / MOCK</span></footer></aside><main className="appMain">{children}</main></div>}




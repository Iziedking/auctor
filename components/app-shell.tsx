import { AuctorLockup } from "./brand/auctor-mark";
import { RailNav } from "./rail-nav";
import { AuthenticatedShellGuard } from "./auth/authenticated-shell-guard";
import { WalletToolbar } from "./web3/wallet-toolbar";
export function AppShell({ children }: { children: React.ReactNode }) { return <AuthenticatedShellGuard><div className="dossierShell"><aside className="commandRail" aria-label="Command rail"><header className="railIdentity"><AuctorLockup /></header><RailNav/><footer className="railTelemetry" aria-label="System status"><span><i className="railPulse"/>Auctor online</span><span>KeeperHub execution</span><span>Memory available</span></footer></aside><main className="appMain"><header className="appTopbar"><WalletToolbar/></header>{children}</main></div></AuthenticatedShellGuard>; }

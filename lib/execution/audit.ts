import type { ExecutionAudit } from "./service.ts";

export interface AuditTimelineEntry { readonly label: string; readonly state: "passed" | "failed" | "pending" | "info"; readonly detail: string; }
export interface AuditReader { getByCorrelation(agentId: string, correlationId: string): Promise<ExecutionAudit | null>; }
export function buildAuditTimeline(audit: ExecutionAudit): readonly AuditTimelineEntry[] {
  const entries: AuditTimelineEntry[] = [{ label: "Execution created", state: "info", detail: `Correlation ${audit.correlationId}` }];
  if (audit.policyVerdict) entries.push({ label: "Policy", state: audit.policyVerdict.allowed ? "passed" : "failed", detail: audit.policyVerdict.allowed ? "All policy checks passed." : audit.policyVerdict.reasons.map((reason) => reason.code).join(", ") });
  if (audit.simulation) entries.push({ label: "Simulation", state: audit.simulation.wouldRevert ? "failed" : "passed", detail: `Gas estimate ${audit.simulation.gasEstimate}${audit.simulation.revertReason ? `: ${audit.simulation.revertReason}` : ""}` });
  if (audit.keeperHubExecutionId) entries.push({ label: "KeeperHub submission", state: "passed", detail: audit.keeperHubExecutionId });
  if (audit.transactionHash) entries.push({ label: "Transaction", state: "passed", detail: audit.transactionHash });
  entries.push({ label: "Outcome", state: audit.status === "confirmed" ? "passed" : audit.status === "failed" || audit.status === "refused" ? "failed" : "pending", detail: audit.status });
  return entries;
}

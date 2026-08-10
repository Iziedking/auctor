import type { FanoutResult, NotificationSpec } from "./fanout.ts";

type ExecutionAudit = {
  readonly id: string;
  readonly agentId: string;
  readonly status: string;
  readonly transactionHash?: string;
};
type NotificationSpecRepository = {
  listEnabled(agentId: string): Promise<readonly { readonly channel: "telegram"; readonly chatId: string }[]>;
};
type NotificationFanout = {
  send(specs: readonly NotificationSpec[]): Promise<FanoutResult>;
};
type NotificationAuditRepository = {
  recordNotification(id: string, evidence: FanoutResult): Promise<void>;
};

const emptyResult: FanoutResult = { attempted: 0, delivered: 0, results: [] };

export async function notifyConfirmedExecution(input: {
  readonly audit: ExecutionAudit;
  readonly specs: NotificationSpecRepository;
  readonly fanout: NotificationFanout;
  readonly auditRepository: NotificationAuditRepository;
}): Promise<FanoutResult> {
  if (input.audit.status !== "confirmed") return emptyResult;
  const specs = await input.specs.listEnabled(input.audit.agentId);
  const text = [
    "Auctor execution confirmed",
    "Audit: " + input.audit.id,
    "Transaction: " + (input.audit.transactionHash ?? "not recorded"),
  ].join(String.fromCharCode(10));
  const result = await input.fanout.send(specs.map((spec) => ({ ...spec, text })));
  await input.auditRepository.recordNotification(input.audit.id, result);
  return result;
}

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { executions, spendLedger } from "./schema.ts";
import * as schema from "./schema.ts";
import type { ExecutionAudit, ExecutionRepository } from "../execution/service.ts";
import type { ExecutionStatus, Simulation } from "../keeperhub/types.ts";
import type { PolicyVerdict } from "../policy/engine.ts";

type Database = PostgresJsDatabase<typeof schema>;
type ExecutionRow = typeof executions.$inferSelect;

export function createDrizzleExecutionRepository(db: Database): ExecutionRepository {
  async function requireAudit(id: string): Promise<ExecutionAudit> {
    const rows = await db.select().from(executions).where(eq(executions.id, id)).limit(1);
    const row = rows[0];
    if (!row) throw new Error(`Execution audit ${id} was not found.`);
    return toAudit(row);
  }

  return {
    async find(agentId, correlationId) {
      const rows = await db.select().from(executions).where(and(eq(executions.agentId, agentId), eq(executions.correlationId, correlationId))).limit(1);
      return rows[0] ? toAudit(rows[0]) : null;
    },
    async claim(input) {
      const inserted = await db.insert(executions).values({
        agentId: input.agentId,
        correlationId: input.correlationId,
        triggerKind: "chat",
        triggerDetail: {},
        policyVerdict: "refused",
        policyDetail: {},
        intent: input.intent,
        recalledMemory: input.recalledMemory ?? [],
        chainId: input.chainId,
        status: "pending",
      }).onConflictDoNothing({ target: [executions.agentId, executions.correlationId] }).returning();
      if (inserted[0]) return { audit: toAudit(inserted[0]), created: true };
      const existing = await this.find(input.agentId, input.correlationId);
      if (!existing) throw new Error("Execution idempotency conflict could not be reconciled.");
      return { audit: existing, created: false };
    },
    async recordPolicy(id, verdict, status) {
      const rows = await db.update(executions).set({
        policyVerdict: verdict.allowed ? "allowed" : "refused",
        policyDetail: verdict,
        status,
        updatedAt: new Date(),
      }).where(eq(executions.id, id)).returning();
      return rows[0] ? toAudit(rows[0]) : requireAudit(id);
    },
    async recordSimulation(id, simulation) {
      const rows = await db.update(executions).set({ simulation, gasEstimate: { units: simulation.gasEstimate }, status: "simulating", updatedAt: new Date() }).where(eq(executions.id, id)).returning();
      return rows[0] ? toAudit(rows[0]) : requireAudit(id);
    },
    async recordSubmission(id, keeperHubExecutionId) {
      const rows = await db.update(executions).set({ khExecutionId: keeperHubExecutionId, status: "submitted", attempts: 1, updatedAt: new Date() }).where(eq(executions.id, id)).returning();
      return rows[0] ? toAudit(rows[0]) : requireAudit(id);
    },
    async recordTerminal(id, terminal) {
      const rows = await db.update(executions).set({ txHash: terminal.transactionHash ?? terminal.receipts[0]?.hash, receipt: terminal, status: "confirmed", updatedAt: new Date() }).where(eq(executions.id, id)).returning();
      return rows[0] ? toAudit(rows[0]) : requireAudit(id);
    },
    async recordFailure(id, reason) {
      const rows = await db.update(executions).set({ status: "failed", failureReason: reason, updatedAt: new Date() }).where(eq(executions.id, id)).returning();
      return rows[0] ? toAudit(rows[0]) : requireAudit(id);
    },
    async addSpend(input) {
      await db.insert(spendLedger).values({ agentId: input.agentId, executionId: input.executionId, kind: input.kind, utcDay: input.utcDay, amountUsd: usdMicrosToDecimal(input.amountUsdMicros) }).onConflictDoNothing({ target: [spendLedger.executionId, spendLedger.kind] });
    },
  };
}

export function usdMicrosToDecimal(value: bigint): string {
  if (value < 0n) throw new Error("Spend cannot be negative.");
  const whole = value / 1_000_000n;
  return `${whole}.${(value % 1_000_000n).toString().padStart(6, "0")}`;
}

function toAudit(row: ExecutionRow): ExecutionAudit {
  const verdict = isPolicyVerdict(row.policyDetail) ? row.policyDetail : undefined;
  const simulation = isSimulation(row.simulation) ? row.simulation : undefined;
  return {
    id: row.id,
    agentId: row.agentId,
    correlationId: row.correlationId,
    status: row.status as ExecutionAudit["status"],
    ...(Array.isArray(row.recalledMemory) ? { recalledMemory: row.recalledMemory.filter((item): item is string => typeof item === "string") } : {}),
    ...(verdict ? { policyVerdict: verdict } : {}),
    ...(simulation ? { simulation } : {}),
    ...(row.khExecutionId ? { keeperHubExecutionId: row.khExecutionId } : {}),
    ...(row.txHash ? { transactionHash: row.txHash } : {}),
  };
}
function isPolicyVerdict(value: unknown): value is PolicyVerdict { return typeof value === "object" && value !== null && "allowed" in value && typeof value.allowed === "boolean" && "checks" in value && Array.isArray(value.checks) && "reasons" in value && Array.isArray(value.reasons); }
function isSimulation(value: unknown): value is Simulation { return typeof value === "object" && value !== null && "status" in value && value.status === "simulated" && "gasEstimate" in value && typeof value.gasEstimate === "string" && "wouldRevert" in value && typeof value.wouldRevert === "boolean"; }

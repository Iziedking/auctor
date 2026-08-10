import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { executions, notifySpecs } from "./schema.ts";
import * as schema from "./schema.ts";
import type { FanoutResult } from "../notifications/fanout.ts";

type Database = PostgresJsDatabase<typeof schema>;

export function createDrizzleNotificationRepository(db: Database) {
  return {
    async listEnabled(agentId: string) {
      const rows = await db.select({ channel: notifySpecs.channel, target: notifySpecs.target })
        .from(notifySpecs)
        .where(and(eq(notifySpecs.agentId, agentId), eq(notifySpecs.enabled, true)));
      return rows
        .filter((row): row is { channel: "telegram"; target: string } => row.channel === "telegram")
        .map((row) => ({ channel: "telegram" as const, chatId: row.target }));
    },
    async recordNotification(id: string, evidence: FanoutResult): Promise<void> {
      await db.update(executions).set({ notified: evidence, updatedAt: new Date() }).where(eq(executions.id, id));
    },
  };
}

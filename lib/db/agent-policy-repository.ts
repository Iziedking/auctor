import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { agents, spendLedger } from "./schema.ts";
import * as schema from "./schema.ts";
import { resolvePolicyRules, usdStringToMicros, type AgentPolicyRecord } from "../policy/agent-rules.ts";
import type { PolicyRules } from "../policy/engine.ts";

type Database = PostgresJsDatabase<typeof schema>;

export type AgentPolicyContext = {
  readonly rules: PolicyRules;
  readonly spentTodayUsdMicros: bigint;
};

export interface AgentPolicyRepository {
  load(agentId: string, utcDay: string): Promise<AgentPolicyContext | null>;
}

export function createDrizzleAgentPolicyRepository(db: Database): AgentPolicyRepository {
  return {
    async load(agentId, utcDay) {
      const rows = await db.select({
        emergencyStop: agents.emergencyStop,
        allowedChains: agents.allowedChains,
        allowedTokens: agents.allowedTokens,
        perTradeCapUsd: agents.perTradeCapUsd,
        dailyCapUsd: agents.dailyCapUsd,
        maxSlippageBps: agents.maxSlippageBps,
        approvalMode: agents.approvalMode,
      }).from(agents).where(eq(agents.id, agentId)).limit(1);
      const agent = rows[0];
      if (!agent) return null;
      const spendRows = await db.select({ total: sql<string>`coalesce(sum(${spendLedger.amountUsd}), 0)::text` })
        .from(spendLedger)
        .where(and(eq(spendLedger.agentId, agentId), eq(spendLedger.utcDay, utcDay), eq(spendLedger.kind, "trade")));
      return createAgentPolicyContext(agent, spendRows[0]?.total ?? "0");
    },
  };
}

export function createAgentPolicyContext(agent: AgentPolicyRecord, spentTodayUsd: string): AgentPolicyContext {
  return { rules: resolvePolicyRules(agent), spentTodayUsdMicros: usdStringToMicros(spentTodayUsd) };
}

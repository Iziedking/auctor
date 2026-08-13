import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { validateAgentSetup } from "../../../../lib/agent/setup.ts";
import { hashToken } from "../../../../lib/auth/email.ts";
import { loadConfig, runtimeEnvironment } from "../../../../lib/config.ts";
import { resolveSession } from "../../../../lib/db/auth-repository.ts";
import { createDatabase } from "../../../../lib/db/client.ts";
import { agents } from "../../../../lib/db/schema.ts";
import { createMemoryClient } from "../../../../lib/memory/client.ts";
import { writeMemoryEvent } from "../../../../lib/memory/event-writer.ts";

export async function POST(request: Request) {
  const token = (await cookies()).get("auctor_session")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = loadConfig(runtimeEnvironment());
  if (!config.database.url) return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
  const database = createDatabase(config.database.url);
  try {
    const session = await resolveSession(database.db, hashToken(token));
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const setup = validateAgentSetup(await request.json());
    const agent = (await database.db.update(agents).set({ name: setup.name, riskProfile: setup.riskProfile, tradingStyle: setup.tradingStyle, autonomyMode: setup.autonomyMode, approvalMode: setup.autonomyMode === "manual" ? "approve" : "autonomous", budgetUsd: String(setup.budgetUsd), dailyCapUsd: String(setup.dailyCapUsd), perTradeCapUsd: String(setup.perTradeCapUsd), allowedChains: [...setup.allowedChains], allowedTokens: [...setup.allowedTokens], maxSlippageBps: setup.maxSlippageBps, emergencyStop: setup.emergencyStop, onboardingCompletedAt: new Date() }).where(and(eq(agents.id, session.agentId), eq(agents.userId, session.userId))).returning())[0];
    if (config.agent.memoryPassphrase) await writeMemoryEvent({ memory: createMemoryClient({ baseUrl: config.memory.url }), userId: session.userId, agentId: session.agentId, memoryKey: session.memoryKey, masterPassphrase: config.agent.memoryPassphrase, type: "policy_changed", source: "web", content: `Onboarding completed for ${setup.name}. Risk ${setup.riskProfile}; autonomy ${setup.autonomyMode}; mandate: ${setup.tradingStyle}`, metadata: { daily_cap_usd: setup.dailyCapUsd, per_trade_cap_usd: setup.perTradeCapUsd, emergency_stop: setup.emergencyStop, allowed_chains: setup.allowedChains.join(","), allowed_tokens: setup.allowedTokens.join(",") } });
    return NextResponse.json({ completed: true, agent });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "invalid_setup" }, { status: 400 });
  } finally { await database.close(); }
}

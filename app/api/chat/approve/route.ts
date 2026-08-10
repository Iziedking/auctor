import { NextResponse } from "next/server";
import { loadConfig, runtimeEnvironment } from "../../../../lib/config.ts";
import { createDatabase } from "../../../../lib/db/client.ts";
import { createDrizzleAgentPolicyRepository } from "../../../../lib/db/agent-policy-repository.ts";
import { createDrizzleExecutionRepository } from "../../../../lib/db/execution-repository.ts";
import { createChatPipeline } from "../../../../lib/chat/pipeline.ts";
import { handleApprovalRequest } from "../../../../lib/chat/approval-api.ts";
import { executeApprovedPreview } from "../../../../lib/chat/approved-trade.ts";
import { createMockTradeMarketData } from "../../../../lib/chat/mock-market-data.ts";
import { createExecutionService } from "../../../../lib/execution/service.ts";
import { createMockKeeperHubClient } from "../../../../lib/keeperhub/mock.ts";
import { createTelegramNotifier } from "../../../../lib/notifications/telegram.ts";
import { createNotificationFanout } from "../../../../lib/notifications/fanout.ts";
import { notifyConfirmedExecution } from "../../../../lib/notifications/execution.ts";
import { createDrizzleNotificationRepository } from "../../../../lib/db/notification-repository.ts";

const pipeline = createChatPipeline({ mode: "mock", chains: { base: "8453" }, tokens: { ETH: "0x4200000000000000000000000000000000000006", USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" }, router: "0x2626664c2603336E57B271c5C0b26F421741e481", simulator: createMockKeeperHubClient() });
export async function POST(request: Request) {
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const config = loadConfig(runtimeEnvironment()); const enabled = config.mockMode && config.database.url !== null && config.agent.id !== null;
  if (!enabled || !config.database.url || !config.agent.id) return NextResponse.json({ error: "mock_approval_unavailable" }, { status: 503 });
  const database = createDatabase(config.database.url);
  try {
    const policyRepository = createDrizzleAgentPolicyRepository(database.db);
    const executionRepository = createDrizzleExecutionRepository(database.db);
    const execution = createExecutionService({ repository: executionRepository, keeperHub: createMockKeeperHubClient() });
    const notificationRepository = createDrizzleNotificationRepository(database.db);
    const fanout = createNotificationFanout({ telegram: createTelegramNotifier({ token: config.notifications.telegramToken, mockMode: config.mockMode }) });
    const response = await handleApprovalRequest(body, { enabled: true, pipeline, execute: async (preview, recalledMemory) => {
      const result = await executeApprovedPreview({ agentId: config.agent.id!, preview, recalledMemory, policyRepository, marketData: createMockTradeMarketData(), execution });
      if (result.kind === "executed") await notifyConfirmedExecution({ audit: result.audit, specs: notificationRepository, fanout, auditRepository: notificationRepository });
      return result;
    } });
    return NextResponse.json(response.body, { status: response.status });
  } finally { await database.close(); }
}

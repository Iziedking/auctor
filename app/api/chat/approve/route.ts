import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hashToken } from "../../../../lib/auth/email.ts";
import { executeApprovedPreview } from "../../../../lib/chat/approved-trade.ts";
import { handleApprovalRequest } from "../../../../lib/chat/approval-api.ts";
import { createPreviewTradeMarketData } from "../../../../lib/chat/preview-market-data.ts";
import { createRuntimeChatPipeline } from "../../../../lib/chat/runtime-pipeline.ts";
import { loadConfig, runtimeEnvironment } from "../../../../lib/config.ts";
import { createDrizzleAgentPolicyRepository } from "../../../../lib/db/agent-policy-repository.ts";
import { resolveSession } from "../../../../lib/db/auth-repository.ts";
import { createDatabase } from "../../../../lib/db/client.ts";
import { createDrizzleExecutionRepository } from "../../../../lib/db/execution-repository.ts";
import { createExecutionService } from "../../../../lib/execution/service.ts";
import { createKeeperHubClient } from "../../../../lib/keeperhub/client.ts";
import { createMemoryClient } from "../../../../lib/memory/client.ts";
import { writeMemoryEvent } from "../../../../lib/memory/event-writer.ts";

export async function POST(request: Request) {
  const token = (await cookies()).get("auctor_session")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = loadConfig(runtimeEnvironment());
  if (config.mockMode || !config.database.url || !config.keeperhub.apiKey) return NextResponse.json({ error: "live_approval_unavailable" }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const database = createDatabase(config.database.url);
  try {
    const session = await resolveSession(database.db, hashToken(token));
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!session.khWalletAddress) return NextResponse.json({ error: "wallet_not_provisioned" }, { status: 503 });
    const keeperHub = createKeeperHubClient({ baseUrl: config.keeperhub.baseUrl, apiKey: config.keeperhub.apiKey });
    const pipeline = createRuntimeChatPipeline({ ...config, keeperhub: { ...config.keeperhub, walletAddress: session.khWalletAddress } });
    const execution = createExecutionService({ repository: createDrizzleExecutionRepository(database.db), keeperHub });
    const memory=createMemoryClient({baseUrl:config.memory.url});
    const response = await handleApprovalRequest(body, {
      enabled: true,
      approvalMode: "live",
      pipeline,
      execute: async (preview, recalledMemory) => {const result=await executeApprovedPreview({
        agentId: session.agentId,
        preview,
        recalledMemory,
        policyRepository: createDrizzleAgentPolicyRepository(database.db),
        marketData: createPreviewTradeMarketData(preview),
        execution,
      });if(config.agent.memoryPassphrase){const content=result.kind==="executed"?`Approved execution ${result.audit.status}. Audit ${result.audit.id}; transaction ${result.audit.transactionHash??"pending receipt"}.`:`Approved execution stopped safely: ${"error"in result?result.error.message:result.reason}.`;await writeMemoryEvent({memory,userId:session.userId,agentId:session.agentId,memoryKey:session.memoryKey,masterPassphrase:config.agent.memoryPassphrase,type:result.kind==="executed"?"execution":"refusal",source:"web",content,correlationId:preview.request.correlationId,metadata:result.kind==="executed"?{audit_id:result.audit.id,status:result.audit.status,transaction_hash:result.audit.transactionHash??null}:{reason:"error"in result?result.error.message:result.reason}})}return result;},
    });
    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "live_approval_failed" }, { status: 503 });
  } finally { await database.close(); }
}

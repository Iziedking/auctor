import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deriveMemoryIdentity } from "../../../lib/auth/memory-identity.ts";
import { hashToken } from "../../../lib/auth/email.ts";
import { loadConfig, runtimeEnvironment } from "../../../lib/config.ts";
import { createDatabase } from "../../../lib/db/client.ts";
import { resolveSession } from "../../../lib/db/auth-repository.ts";
import { createDrizzleConversationRepository } from "../../../lib/db/conversation-repository.ts";
import { createDrizzleAgentPolicyRepository } from "../../../lib/db/agent-policy-repository.ts";
import { createConversationService } from "../../../lib/chat/conversation-service.ts";
import { handleChatRequest } from "../../../lib/chat/api.ts";
import { createChatSession } from "../../../lib/chat/pipeline.ts";
import { createMemoryClient } from "../../../lib/memory/client.ts";
import { createRuntimeChatPipeline } from "../../../lib/chat/runtime-pipeline.ts";
import { createLlmClient } from "../../../lib/llm/client.ts";
import { createNaturalLanguageRouter } from "../../../lib/llm/router.ts";
import { createKeeperHubPaymentSigner } from "../../../lib/keeperhub/payment-signer.ts";
import { createDrizzleResearchRepository } from "../../../lib/db/research-repository.ts";
import { createPaidResearchService } from "../../../lib/research/x402.ts";
import { createKeyedResearchService } from "../../../lib/research/keyed.ts";
import { createResearchRouter } from "../../../lib/research/router.ts";
import { writeMemoryEvent } from "../../../lib/memory/event-writer.ts";
import { discoverDexToken } from "../../../lib/research/dexscreener.ts";
export async function POST(request: Request) {
  const config = loadConfig(runtimeEnvironment());
  const token = (await cookies()).get("auctor_session")?.value;
  if (!token)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!config.database.url || !config.agent.memoryPassphrase)
    return NextResponse.json({ error: "agent_unavailable" }, { status: 503 });
  const database = createDatabase(config.database.url);
  try {
    const session = await resolveSession(database.db, hashToken(token));
    if (!session)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!session.khOrgId || !session.khWalletAddress)
      return NextResponse.json(
        { error: "wallet_not_provisioned" },
        { status: 503 },
      );
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const pipeline = createRuntimeChatPipeline({
      ...config,
      ...(walletOwner(session.email)?{ownerAddress:walletOwner(session.email)!}:{}),
      keeperhub: {
        ...config.keeperhub,
        walletAddress: session.khWalletAddress,
      },
    });
    const identity = deriveMemoryIdentity({
      userId: session.userId,
      memoryKey: session.memoryKey,
      masterPassphrase: config.agent.memoryPassphrase,
      folder: `agent-${session.agentId}`,
    });
    const memory = createMemoryClient({ baseUrl: config.memory.url });
    const chatSession = createChatSession({ pipeline, memory });
    const conversation = createConversationService({
      repository: createDrizzleConversationRepository(database.db),
      pipeline,
    });
    const language = createNaturalLanguageRouter({
      client: createLlmClient(config.llm),
    });
    const policy = await createDrizzleAgentPolicyRepository(database.db).load(
      session.agentId,
      new Date().toISOString().slice(0, 10),
    );
    const repository = createDrizzleResearchRepository(database.db);
    const signer =
      session.khHmacSecretEncrypted && config.keeperhub.signerEncryptionKey
        ? createKeeperHubPaymentSigner({
            subOrgId: session.khOrgId,
            walletAddress: session.khWalletAddress as `0x${string}`,
            encryptedHmacSecret: session.khHmacSecretEncrypted,
            encryptionKey: config.keeperhub.signerEncryptionKey,
            baseUrl: config.keeperhub.baseUrl,
          })
        : undefined;
    const paidResearch = createPaidResearchService({
      dailyBudgetUsd: config.budgets.researchUsdPerDay,
      spentTodayUsd: await repository.spentToday(session.agentId),
      ...(signer ? { signer } : {}),
      record: (input) => repository.record(input),
    });
    const keyedResearch = createKeyedResearchService({
      adanosApiKey: config.research.adanosApiKey,
      newsEndpoint: config.research.newsEndpoint,
    });
    const researchRouter =
      config.research.providers.length ||
      config.research.adanosApiKey ||
      config.research.newsEndpoint
        ? createResearchRouter({
            agentId: session.agentId,
            providers: config.research.providers,
            keyed: keyedResearch,
            paid: paidResearch,
            hasAdanos: Boolean(config.research.adanosApiKey),
            hasNews: Boolean(config.research.newsEndpoint),
          })
        : undefined;
    const research = { run: async (text:string) => { if (/\b(portfolio|balance|holdings|wallet)\b/i.test(text) || /\b(swap|trade|buy|sell)\b/i.test(text)) return null; const token = await discoverDexToken(text).catch(() => null); const paid = researchRouter ? await researchRouter.run(text).catch(() => null) : null; const result = token || paid ? { ...(token ? { token } : {}), ...(paid ? { paid } : {}) } : null; if (result) await writeMemoryEvent({ memory, userId: session.userId, agentId: session.agentId, memoryKey: session.memoryKey, masterPassphrase: config.agent.memoryPassphrase!, type: "research", source: "web", content: `Research completed for: ${text}`, metadata: { provider_evidence: JSON.stringify(result).slice(0, 1500) } }); return result; } };
    const response = await handleChatRequest(body, {
      pipeline,
      session: chatSession,
      identity,
      conversation,
      agentId: session.agentId,
      language,
      agent: {
        name: session.agentName,
        autonomyMode: session.autonomyMode,
        dailyCapUsd: policy
          ? String(Number(policy.rules.maxDailyUsdMicros) / 1_000_000)
          : "0",
      },
      ...(research ? { research } : {}),
    });
    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "chat_unavailable" },
      { status: 503 },
    );
  } finally {
    await database.close();
  }
}
function walletOwner(email:string){const match=/^(0x[0-9a-f]{40})@wallet\.auctor\.space$/i.exec(email);return match?.[1] as `0x${string}`|undefined}

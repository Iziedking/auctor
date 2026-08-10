import { NextResponse } from "next/server";
import { handleChatRequest } from "../../../lib/chat/api.ts";

import { createChatSession } from "../../../lib/chat/pipeline.ts";
import { createMemoryClient } from "../../../lib/memory/client.ts";
import { loadConfig, runtimeEnvironment } from "../../../lib/config.ts";
import { createDatabase } from "../../../lib/db/client.ts";
import { createDrizzleConversationRepository } from "../../../lib/db/conversation-repository.ts";
import { createConversationService } from "../../../lib/chat/conversation-service.ts";
import { createRuntimeChatPipeline } from "../../../lib/chat/runtime-pipeline.ts";


export async function POST(request: Request) {
  const config = loadConfig(runtimeEnvironment());
  const pipeline = createRuntimeChatPipeline(config);
  const memory = config.capabilities.memory ? createMemoryClient({ baseUrl: config.memory.url }) : null;
  const session = memory ? createChatSession({ pipeline, memory }) : null;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const identity = session && config.agent.memoryUser && config.agent.memoryPassphrase
    ? { session, identity: { user: config.agent.memoryUser, passphrase: config.agent.memoryPassphrase, folder: config.agent.memoryFolder } }
    : {};
  if (config.database.url && config.agent.id) {
    const database = createDatabase(config.database.url);
    try {
      const conversation = createConversationService({ repository: createDrizzleConversationRepository(database.db), pipeline });
      const response = await handleChatRequest(body, { pipeline, ...identity, conversation, agentId: config.agent.id });
      return NextResponse.json(response.body, { status: response.status });
    } catch {
      return NextResponse.json({ error: "persistence_unavailable" }, { status: 503 });
    } finally {
      await database.close();
    }
  }
  const response = await handleChatRequest(body, { pipeline, ...identity });
  return NextResponse.json(response.body, { status: response.status });
}

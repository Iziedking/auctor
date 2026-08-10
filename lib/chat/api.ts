import { z } from "zod";
import type { createChatPipeline, createChatSession } from "./pipeline.ts";
import type { createConversationService } from "./conversation-service.ts";

const requestSchema = z.object({
  text: z.string().trim().min(1).max(2_000),
  correlationId: z.string().trim().min(1).max(128),
  conversationId: z.string().uuid().optional(),
  approved: z.boolean().optional(),
}).strict();

type Pipeline = ReturnType<typeof createChatPipeline>;
type Session = ReturnType<typeof createChatSession>;
type Conversation = ReturnType<typeof createConversationService>;

export async function handleChatRequest(input: unknown, deps: { readonly pipeline: Pipeline; readonly session?: Session; readonly identity?: { readonly user: string; readonly passphrase: string; readonly folder: string }; readonly conversation?: Conversation; readonly agentId?: string }) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { status: 400 as const, body: { error: "invalid_request" as const } };
  if (deps.conversation && deps.agentId) {
    const recalledMemory = deps.session && deps.identity ? await deps.session.recallMemory({ text: parsed.data.text, ...deps.identity }) : [];
    const persisted = await deps.conversation.handle({ agentId: deps.agentId, text: parsed.data.text, correlationId: parsed.data.correlationId, ...(parsed.data.conversationId ? { conversationId: parsed.data.conversationId } : {}), recalledMemory });
    if (deps.session && deps.identity && isExplicitPreference(parsed.data.text)) {
      await deps.session.rememberDecision({ ...deps.identity, text: parsed.data.text });
    }
    return { status: 200 as const, body: { ...persisted.response, conversationId: persisted.conversationId } };
  }
  const result = deps.session && deps.identity ? await deps.session.handle({ ...parsed.data, ...deps.identity }) : await deps.pipeline.handle(parsed.data);
  if (deps.session && deps.identity && isExplicitPreference(parsed.data.text)) {
    await deps.session.rememberDecision({ ...deps.identity, text: parsed.data.text });
  }
  return { status: 200 as const, body: result };
}

function isExplicitPreference(text: string): boolean {
  return /^(remember|prefer|always|never)([ :]|$)/i.test(text);
}

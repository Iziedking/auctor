import type { ChatPipelineResult, createChatPipeline } from "./pipeline.ts";

export interface ConversationRepository {
  open(input: { readonly agentId: string }): Promise<string>;
  append(input: { readonly conversationId: string; readonly role: "user" | "agent"; readonly content: string; readonly recalledMemory: readonly string[] }): Promise<void>;
}

type Pipeline = ReturnType<typeof createChatPipeline>;

export function createConversationService(deps: { readonly repository: ConversationRepository; readonly pipeline: Pipeline }) {
  return {
    async handle(input: { readonly agentId: string; readonly conversationId?: string; readonly text: string; readonly correlationId: string; readonly recalledMemory?: readonly string[] }): Promise<{ readonly conversationId: string; readonly response: ChatPipelineResult }> {
      const conversationId = input.conversationId ?? await deps.repository.open({ agentId: input.agentId });
      const recalledMemory = input.recalledMemory ?? [];
      await deps.repository.append({ conversationId, role: "user", content: input.text, recalledMemory });
      const response = await deps.pipeline.handle({ text: input.text, correlationId: input.correlationId, recalledMemory });
      await deps.repository.append({ conversationId, role: "agent", content: response.kind === "preview" ? "Preview prepared." : response.kind === "message" ? response.message : response.reason, recalledMemory });
      return { conversationId, response };
    },
  };
}

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { conversations, messages } from "./schema.ts";
import * as schema from "./schema.ts";
import type { ConversationRepository } from "../chat/conversation-service.ts";

type Database = PostgresJsDatabase<typeof schema>;

export function createDrizzleConversationRepository(db: Database): ConversationRepository {
  return {
    async open(input) {
      const rows = await db.insert(conversations).values({ agentId: input.agentId }).returning({ id: conversations.id });
      const row = rows[0];
      if (!row) throw new Error("Conversation could not be created.");
      return row.id;
    },
    async append(input) {
      await db.insert(messages).values({
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        recalledMemory: input.recalledMemory,
      });
    },
  };
}

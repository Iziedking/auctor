import { deriveMemoryIdentity } from "../auth/memory-identity.ts";
import { formatMemoryEvent, type MemoryEventSource, type MemoryEventType } from "./events.ts";

export async function writeMemoryEvent(input: {
  readonly memory: { remember(input: { user: string; passphrase: string; folder: string; text: string }): Promise<unknown> };
  readonly userId: string;
  readonly agentId: string;
  readonly memoryKey: string;
  readonly masterPassphrase: string;
  readonly type: MemoryEventType;
  readonly source: MemoryEventSource;
  readonly content: string;
  readonly correlationId?: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}): Promise<void> {
  try {
    const identity = deriveMemoryIdentity({ userId: input.userId, memoryKey: input.memoryKey, masterPassphrase: input.masterPassphrase, folder: `agent-${input.agentId}` });
    await input.memory.remember({ user: identity.user, passphrase: identity.passphrase, folder: identity.folder, text: formatMemoryEvent({ type: input.type, source: input.source, content: input.content, ...(input.correlationId ? { correlationId: input.correlationId } : {}), ...(input.metadata ? { metadata: input.metadata } : {}) }) });
  } catch {
    // Memory is narrative context; it must never make an authorized request fail.
  }
}

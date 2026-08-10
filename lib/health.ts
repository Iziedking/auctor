import type { Config } from "./config.ts";
import type { MemoryStatusResult } from "./memory/client.ts";

type MemoryHealthClient = { memoryStatus(): Promise<MemoryStatusResult> };

export async function buildCapabilityHealth(config: Config, memory?: MemoryHealthClient) {
  let memoryHealth: { state: string; bufferedLocal?: number; cachedLocal?: number; quilts?: number } = { state: config.capabilities.memory ? "configured" : "disabled" };
  if (config.capabilities.memory && memory) {
    const status = await memory.memoryStatus();
    memoryHealth = status.kind === "available"
      ? { state: "available", bufferedLocal: status.bufferedLocal, cachedLocal: status.cachedLocal, quilts: status.quilts }
      : { state: status.kind };
  }
  return {
    status: "ok" as const,
    mode: config.mockMode ? "mock" as const : "live" as const,
    database: config.capabilities.database ? "configured" as const : "disabled" as const,
    execution: config.mockMode ? "mock" as const : config.capabilities.execution ? "configured" as const : "disabled" as const,
    memory: memoryHealth,
    llm: config.mockMode ? "mock" as const : config.capabilities.llm ? "configured" as const : "disabled" as const,
    approval: {
      mode: "fixture" as const,
      available: config.mockMode && config.database.url !== null && config.agent.id !== null,
    },
  };
}

import type { PolicyRules } from "./engine.ts";

export interface AgentPolicyRecord {
  readonly emergencyStop: boolean;
  readonly allowedChains: readonly string[];
  readonly allowedTokens: readonly string[];
  readonly perTradeCapUsd: string;
  readonly dailyCapUsd: string;
  readonly maxSlippageBps: number;
  readonly approvalMode: "approve" | "autonomous";
}

export function usdStringToMicros(value: string): bigint {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value)) throw new Error(`Invalid USD amount: ${value}`);
  const parts = value.split("."); const whole = parts[0] ?? "0"; const fraction = parts[1] ?? "";
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

export function resolvePolicyRules(agent: AgentPolicyRecord): PolicyRules {
  return {
    emergencyStop: agent.emergencyStop,
    allowedChains: agent.allowedChains,
    allowedTokens: agent.allowedTokens,
    maxTradeUsdMicros: usdStringToMicros(agent.perTradeCapUsd),
    maxDailyUsdMicros: usdStringToMicros(agent.dailyCapUsd),
    maxSlippageBps: BigInt(agent.maxSlippageBps),
    approvalMode: agent.approvalMode === "approve" ? "human" : "autonomous",
  };
}



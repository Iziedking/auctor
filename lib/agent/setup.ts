export type AutonomyMode = "manual" | "guarded" | "autonomous";
export type AgentSetupInput = { readonly name?: string; readonly autonomyMode?: AutonomyMode; readonly budgetUsd?: number; readonly dailyCapUsd?: number; readonly perTradeCapUsd?: number; readonly allowedChains?: readonly string[]; readonly allowedTokens?: readonly string[]; readonly maxSlippageBps?: number };
export type AgentSetup = { readonly name: string; readonly autonomyMode: AutonomyMode; readonly budgetUsd: number; readonly dailyCapUsd: number; readonly perTradeCapUsd: number; readonly allowedChains: readonly string[]; readonly allowedTokens: readonly string[]; readonly maxSlippageBps: number };
export function validateAgentSetup(input: AgentSetupInput): AgentSetup {
  const name=input.name?.trim()||"Auctor Agent";
  if(name.length>80) throw new Error("Agent name must be 80 characters or fewer.");
  const autonomyMode=input.autonomyMode??"manual";
  const budgetUsd=input.budgetUsd??0;
  const dailyCapUsd=input.dailyCapUsd??budgetUsd;
  const perTradeCapUsd=input.perTradeCapUsd??dailyCapUsd;
  if(!["manual","guarded","autonomous"].includes(autonomyMode)) throw new Error("Unsupported autonomy mode.");
  for(const [label,value] of [["budget",budgetUsd],["daily cap",dailyCapUsd],["per-trade cap",perTradeCapUsd]] as const) if(!Number.isFinite(value)||value<0) throw new Error(`${label} must be non-negative.`);
  if(dailyCapUsd>budgetUsd) throw new Error("Daily cap cannot exceed the total budget.");
  if(perTradeCapUsd>dailyCapUsd) throw new Error("Per-trade cap cannot exceed the daily cap.");
  const maxSlippageBps=input.maxSlippageBps??100;
  if(!Number.isInteger(maxSlippageBps)||maxSlippageBps<0||maxSlippageBps>5000) throw new Error("Maximum slippage must be between 0 and 5000 basis points.");
  const allowedChains=[...(input.allowedChains??["8453"])].map(x=>x.trim()).filter(Boolean);
  if(!allowedChains.length) throw new Error("At least one chain is required.");
  return {name,autonomyMode,budgetUsd,dailyCapUsd,perTradeCapUsd,allowedChains,allowedTokens:[...(input.allowedTokens??[])].map(x=>x.trim()).filter(Boolean),maxSlippageBps};
}
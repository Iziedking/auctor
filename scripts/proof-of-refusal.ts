import { evaluatePolicy, type PolicyInput, type PolicyRules } from "../lib/policy/engine.ts";

const rules: PolicyRules = {
  emergencyStop: false,
  allowedChains: ["8453"],
  allowedTokens: ["0xweth", "0xusdc"],
  maxTradeUsdMicros: 5_000_000n,
  maxDailyUsdMicros: 10_000_000n,
  maxSlippageBps: 100n,
  approvalMode: "autonomous",
};
const input: PolicyInput = {
  chainId: "8453",
  tokenIn: "0xweth",
  tokenOut: "0xusdc",
  amountIn: 1_000n,
  availableBalance: 2_000n,
  notionalUsdMicros: 2_000_000n,
  spentTodayUsdMicros: 1_000_000n,
  quotedOut: 2_000_000n,
  minOut: 1_990_000n,
  humanApproved: false,
};

const cases = [
  ["over cap", { notionalUsdMicros: 5_000_001n }, {}],
  ["wrong chain", { chainId: "1" }, {}],
  ["emergency stop", {}, { emergencyStop: true }],
  ["disallowed token", { tokenOut: "0xdai" }, {}],
  ["insufficient balance", { amountIn: 2_001n }, {}],
] as const;

for (const [name, inputOverride, ruleOverride] of cases) {
  const verdict = evaluatePolicy({ ...input, ...inputOverride }, { ...rules, ...ruleOverride });
  process.stdout.write(`${name}: ${verdict.allowed ? "ALLOWED" : "REFUSED"} [${verdict.reasons.map((reason) => reason.code).join(", ")}]\n`);
  if (verdict.allowed) process.exitCode = 1;
}

export type ApprovalMode = "autonomous" | "human";

export interface PolicyRules {
  readonly emergencyStop: boolean;
  readonly allowedChains: readonly string[];
  readonly allowedTokens: readonly string[];
  readonly maxTradeUsdMicros: bigint;
  readonly maxDailyUsdMicros: bigint;
  readonly maxSlippageBps: bigint;
  readonly approvalMode: ApprovalMode;
}

export interface PolicyInput {
  readonly chainId: string;
  readonly tokenIn: string;
  readonly tokenOut: string;
  readonly amountIn: bigint;
  readonly availableBalance: bigint;
  readonly notionalUsdMicros: bigint;
  readonly spentTodayUsdMicros: bigint;
  readonly quotedOut: bigint;
  readonly minOut: bigint;
  readonly humanApproved: boolean;
}

export type PolicyReasonCode =
  | "emergency_stop"
  | "chain_not_allowed"
  | "token_not_allowed"
  | "trade_cap_exceeded"
  | "daily_cap_exceeded"
  | "insufficient_balance"
  | "slippage_exceeded"
  | "approval_required";

export interface PolicyCheck {
  readonly code: PolicyReasonCode;
  readonly passed: boolean;
  readonly message: string;
}

export interface PolicyVerdict {
  readonly allowed: boolean;
  readonly checks: readonly PolicyCheck[];
  readonly reasons: readonly PolicyCheck[];
}

export function evaluatePolicy(input: PolicyInput, rules: PolicyRules): PolicyVerdict {
  validateNonNegative(input, rules);
  const allowedTokens = new Set(rules.allowedTokens.map((token) => token.toLowerCase()));
  const slippageFloor = input.quotedOut * (10_000n - rules.maxSlippageBps) / 10_000n;
  const checks: PolicyCheck[] = [
    check("emergency_stop", !rules.emergencyStop, "Emergency stop is active."),
    check("chain_not_allowed", rules.allowedChains.includes(input.chainId), `Chain ${input.chainId} is not allowed.`),
    check(
      "token_not_allowed",
      allowedTokens.has(input.tokenIn.toLowerCase()) && allowedTokens.has(input.tokenOut.toLowerCase()),
      "One or more tokens are not allowed.",
    ),
    check("trade_cap_exceeded", input.notionalUsdMicros <= rules.maxTradeUsdMicros, "Trade exceeds the per-trade cap."),
    check(
      "daily_cap_exceeded",
      input.spentTodayUsdMicros + input.notionalUsdMicros <= rules.maxDailyUsdMicros,
      "Trade would exceed the daily cap.",
    ),
    check("insufficient_balance", input.amountIn <= input.availableBalance, "Available token balance is insufficient."),
    check("slippage_exceeded", input.minOut >= slippageFloor, "Minimum output is below the configured slippage floor."),
    check(
      "approval_required",
      rules.approvalMode === "autonomous" || input.humanApproved,
      "Human approval is required.",
    ),
  ];
  const reasons = checks.filter((item) => !item.passed);
  return { allowed: reasons.length === 0, checks, reasons };
}

function check(code: PolicyReasonCode, passed: boolean, message: string): PolicyCheck {
  return { code, passed, message };
}

function validateNonNegative(input: PolicyInput, rules: PolicyRules): void {
  const values = [
    input.amountIn,
    input.availableBalance,
    input.notionalUsdMicros,
    input.spentTodayUsdMicros,
    input.quotedOut,
    input.minOut,
    rules.maxTradeUsdMicros,
    rules.maxDailyUsdMicros,
    rules.maxSlippageBps,
  ];
  if (values.some((value) => value < 0n)) throw new Error("Policy values must be non-negative.");
  if (rules.maxSlippageBps > 10_000n) throw new Error("maxSlippageBps cannot exceed 10000.");
}

import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const riskProfile = pgEnum("risk_profile", ["conservative", "balanced", "aggressive"]);
export const approvalMode = pgEnum("approval_mode", ["approve", "autonomous"]);
export const autonomyMode = pgEnum("autonomy_mode", ["manual", "guarded", "autonomous"]);
export const messageRole = pgEnum("message_role", ["user", "agent", "system"]);
export const triggerKind = pgEnum("trigger_kind", ["chat", "schedule", "watch", "reconcile"]);
export const policyVerdict = pgEnum("policy_verdict", ["allowed", "clamped", "refused"]);
export const executionStatus = pgEnum("execution_status", ["pending", "simulating", "awaiting_approval", "submitted", "confirmed", "failed", "refused", "cancelled"]);
export const spendKind = pgEnum("spend_kind", ["trade", "research", "gas"]);
export const paymentProtocol = pgEnum("payment_protocol", ["x402", "mpp"]);
export const scheduledTaskKind = pgEnum("scheduled_task_kind", ["watch", "recurring_buy", "rebalance", "briefing"]);
export const notifyChannel = pgEnum("notify_channel", ["telegram", "email", "discord"]);
export const channelProvider = pgEnum("channel_provider", ["telegram", "whatsapp"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const memoryIdentities = pgTable("memory_identities", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  memoryKey: text("memory_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  riskProfile: riskProfile("risk_profile").notNull(),
  tradingStyle: text("trading_style").notNull(),
  approvalMode: approvalMode("approval_mode").default("approve").notNull(),
  autonomyMode: autonomyMode("autonomy_mode").default("manual").notNull(),
  budgetUsd: numeric("budget_usd", { precision: 18, scale: 2 }).notNull(),
  dailyCapUsd: numeric("daily_cap_usd", { precision: 18, scale: 2 }).notNull(),
  perTradeCapUsd: numeric("per_trade_cap_usd", { precision: 18, scale: 2 }).notNull(),
  maxSlippageBps: integer("max_slippage_bps").default(100).notNull(),
  allowedChains: text("allowed_chains").array().notNull(),
  allowedTokens: text("allowed_tokens").array().default([]).notNull(),
  emergencyStop: boolean("emergency_stop").default(false).notNull(),
  khOrgId: text("kh_org_id"),
  khWalletAddress: text("kh_wallet_address"),
  khHmacSecretEncrypted: text("kh_hmac_secret_encrypted"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const channelConnections = pgTable("channel_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  provider: channelProvider("provider").notNull(),
  externalIdentity: text("external_identity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("channel_provider_identity").on(table.provider, table.externalIdentity)]);
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRole("role").notNull(),
  content: text("content").notNull(),
  recalledMemory: jsonb("recalled_memory"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const executions = pgTable("executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  correlationId: text("correlation_id").notNull(),
  triggerKind: triggerKind("trigger_kind").notNull(),
  triggerDetail: jsonb("trigger_detail").notNull(),
  recalledMemory: jsonb("recalled_memory"),
  researchUsed: jsonb("research_used"),
  reasoning: text("reasoning"),
  policyVerdict: policyVerdict("policy_verdict").notNull(),
  policyDetail: jsonb("policy_detail").notNull(),
  intent: jsonb("intent").notNull(),
  chainId: text("chain_id").notNull(),
  simulation: jsonb("simulation"),
  gasEstimate: jsonb("gas_estimate"),
  khWorkflowId: text("kh_workflow_id"),
  khExecutionId: text("kh_execution_id"),
  txHash: text("tx_hash"),
  receipt: jsonb("receipt"),
  status: executionStatus("status").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  failureReason: text("failure_reason"),
  gasUsed: numeric("gas_used", { precision: 38, scale: 0 }),
  notified: jsonb("notified"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("executions_idempotency").on(table.agentId, table.correlationId),
]);

export const spendLedger = pgTable("spend_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  utcDay: date("utc_day").notNull(),
  kind: spendKind("kind").notNull(),
  amountUsd: numeric("amount_usd", { precision: 18, scale: 6 }).notNull(),
  executionId: uuid("execution_id").references(() => executions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("spend_ledger_day").on(table.agentId, table.utcDay, table.kind),
  uniqueIndex("spend_ledger_execution_kind").on(table.executionId, table.kind),
]);

export const researchPurchases = pgTable("research_purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  endpoint: text("endpoint").notNull(),
  protocol: paymentProtocol("protocol").notNull(),
  priceUsd: numeric("price_usd", { precision: 18, scale: 6 }).notNull(),
  paymentTx: text("payment_tx"),
  responseHash: text("response_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scheduledTasks = pgTable("scheduled_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  kind: scheduledTaskKind("kind").notNull(),
  spec: jsonb("spec").notNull(),
  cron: text("cron"),
  enabled: boolean("enabled").default(true).notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifySpecs = pgTable("notify_specs", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  channel: notifyChannel("channel").notNull(),
  target: text("target").notNull(),
  events: text("events").array().notNull(),
  enabled: boolean("enabled").default(true).notNull(),
});

export const llmCalls = pgTable("llm_calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
  executionId: uuid("execution_id").references(() => executions.id),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputHash: text("input_hash").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costUsd: numeric("cost_usd", { precision: 18, scale: 6 }),
  latencyMs: integer("latency_ms"),
  conclusion: text("conclusion"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

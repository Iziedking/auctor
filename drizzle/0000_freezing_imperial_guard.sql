CREATE TYPE "public"."approval_mode" AS ENUM('approve', 'autonomous');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('pending', 'simulating', 'awaiting_approval', 'submitted', 'confirmed', 'failed', 'refused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'agent', 'system');--> statement-breakpoint
CREATE TYPE "public"."notify_channel" AS ENUM('telegram', 'email', 'discord');--> statement-breakpoint
CREATE TYPE "public"."payment_protocol" AS ENUM('x402', 'mpp');--> statement-breakpoint
CREATE TYPE "public"."policy_verdict" AS ENUM('allowed', 'clamped', 'refused');--> statement-breakpoint
CREATE TYPE "public"."risk_profile" AS ENUM('conservative', 'balanced', 'aggressive');--> statement-breakpoint
CREATE TYPE "public"."scheduled_task_kind" AS ENUM('watch', 'recurring_buy', 'rebalance', 'briefing');--> statement-breakpoint
CREATE TYPE "public"."spend_kind" AS ENUM('trade', 'research', 'gas');--> statement-breakpoint
CREATE TYPE "public"."trigger_kind" AS ENUM('chat', 'schedule', 'watch', 'reconcile');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"risk_profile" "risk_profile" NOT NULL,
	"trading_style" text NOT NULL,
	"approval_mode" "approval_mode" DEFAULT 'approve' NOT NULL,
	"budget_usd" numeric(18, 2) NOT NULL,
	"daily_cap_usd" numeric(18, 2) NOT NULL,
	"per_trade_cap_usd" numeric(18, 2) NOT NULL,
	"max_slippage_bps" integer DEFAULT 100 NOT NULL,
	"allowed_chains" text[] NOT NULL,
	"allowed_tokens" text[] DEFAULT '{}' NOT NULL,
	"emergency_stop" boolean DEFAULT false NOT NULL,
	"kh_org_id" text,
	"kh_wallet_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"correlation_id" text NOT NULL,
	"trigger_kind" "trigger_kind" NOT NULL,
	"trigger_detail" jsonb NOT NULL,
	"recalled_memory" jsonb,
	"research_used" jsonb,
	"reasoning" text,
	"policy_verdict" "policy_verdict" NOT NULL,
	"policy_detail" jsonb NOT NULL,
	"intent" jsonb NOT NULL,
	"chain_id" text NOT NULL,
	"simulation" jsonb,
	"gas_estimate" jsonb,
	"kh_workflow_id" text,
	"kh_execution_id" text,
	"tx_hash" text,
	"status" "execution_status" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"failure_reason" text,
	"gas_used" numeric(38, 0),
	"notified" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"execution_id" uuid,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_hash" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(18, 6),
	"latency_ms" integer,
	"conclusion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_identities" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"memory_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"recalled_memory" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notify_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"channel" "notify_channel" NOT NULL,
	"target" text NOT NULL,
	"events" text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"endpoint" text NOT NULL,
	"protocol" "payment_protocol" NOT NULL,
	"price_usd" numeric(18, 6) NOT NULL,
	"payment_tx" text,
	"response_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"kind" "scheduled_task_kind" NOT NULL,
	"spec" jsonb NOT NULL,
	"cron" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spend_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"utc_day" date NOT NULL,
	"kind" "spend_kind" NOT NULL,
	"amount_usd" numeric(18, 6) NOT NULL,
	"execution_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_identities" ADD CONSTRAINT "memory_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notify_specs" ADD CONSTRAINT "notify_specs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_purchases" ADD CONSTRAINT "research_purchases_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_tasks" ADD CONSTRAINT "scheduled_tasks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_ledger" ADD CONSTRAINT "spend_ledger_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_ledger" ADD CONSTRAINT "spend_ledger_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "executions_idempotency" ON "executions" USING btree ("agent_id","correlation_id");--> statement-breakpoint
CREATE INDEX "spend_ledger_day" ON "spend_ledger" USING btree ("agent_id","utc_day","kind");
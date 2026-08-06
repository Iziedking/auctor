ALTER TABLE "executions" ADD COLUMN "receipt" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "spend_ledger_execution_kind" ON "spend_ledger" USING btree ("execution_id","kind");
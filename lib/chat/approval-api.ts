import { z } from "zod";
import type { ChatPipelineResult, createChatPipeline } from "./pipeline.ts";
import { isCapturedMockApprovalPreview } from "./approval-ui.ts";

const schema = z.object({ text: z.string().trim().min(1).max(2_000), correlationId: z.string().trim().min(1).max(128), recalledMemory: z.array(z.string().max(2_000)).max(8).default([]) }).strict();
type Pipeline = ReturnType<typeof createChatPipeline>;
type ApprovedResult = { readonly kind: "executed"; readonly audit: { readonly id: string; readonly status: string; readonly transactionHash?: string } } | { readonly kind: "refused"; readonly error: { readonly code: string; readonly message: string } } | { readonly kind: "unavailable"; readonly reason: string };

export async function handleApprovalRequest(input: unknown, deps: { readonly enabled: boolean; readonly approvalMode?: "fixture" | "live"; readonly pipeline: Pipeline; readonly execute: (preview: Extract<ChatPipelineResult, { kind: "preview" }>, recalledMemory: readonly string[]) => Promise<ApprovedResult> }) {
  const approvalMode = deps.approvalMode ?? "fixture";
  if (!deps.enabled) return { status: 503 as const, body: { error: approvalMode === "live" ? "live_approval_unavailable" as const : "mock_approval_unavailable" as const } };
  const parsed = schema.safeParse(input); if (!parsed.success) return { status: 400 as const, body: { error: "invalid_request" as const } };
  const preview = await deps.pipeline.handle({ text: parsed.data.text, correlationId: parsed.data.correlationId, recalledMemory: parsed.data.recalledMemory });
  if (preview.kind !== "preview") return { status: 409 as const, body: { error: "command_not_approvable" as const, reason: preview.kind === "refused" ? preview.reason : preview.message } };
  if (approvalMode === "fixture" && !isCapturedMockApprovalPreview(preview)) return { status: 409 as const, body: { error: "unsupported_mock_trade" as const, reason: "Only the captured 0.001 ETH to USDC trade on Base can be approved in mock mode." } };
  const result = await deps.execute(preview, parsed.data.recalledMemory);
  if (result.kind === "executed") return { status: 200 as const, body: result };
  if (result.kind === "refused") return { status: 409 as const, body: result };
  return { status: 503 as const, body: result };
}


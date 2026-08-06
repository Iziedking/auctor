// KeeperHub REST contract. Verified 2026-08-06 against:
// https://docs.keeperhub.com/api/direct-execution and captured P0 fixtures.

import { z } from "zod";
import { err, ok, type Result } from "../result.ts";
import type {
  ExecError,
  ExecutionReceipt,
  ExecutionRequest,
  ExecutionStatus,
  KeeperHubClient,
  Simulation,
  Submitted,
} from "./types.ts";

export type { KeeperHubClient } from "./types.ts";

const simulationSchema = z.object({
  status: z.literal("simulated"),
  gasEstimate: z.string(),
  wouldRevert: z.boolean(),
  revertReason: z.string().optional(),
});
const submittedSchema = z.object({
  executionId: z.string(),
  status: z.enum(["pending", "running", "completed"]),
});
const receiptSchema = z.object({
  hash: z.string(),
  chainId: z.number(),
  verified: z.boolean(),
  receiptStatus: z.string(),
});
const statusSchema = z.object({
  executionId: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  sponsored: z.boolean().optional(),
  transactionHash: z.string().optional(),
  transactionLink: z.string().optional(),
  receipts: z.array(receiptSchema),
});
interface ClientOptions {
  readonly baseUrl: string;
  readonly apiKey: string | null;
  readonly fetch?: typeof globalThis.fetch;
  readonly sleep?: (milliseconds: number) => Promise<void>;
}

export function createKeeperHubClient(options: ClientOptions): KeeperHubClient {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const simulated = new Set<string>();

  return {
    async simulate(req) {
      const preflight = validateRequest(req, options.apiKey);
      if (preflight) return err(preflight);
      const response = await requestJson(fetchFn, sleep, options, endpoint(req), body(req, true), undefined);
      if (!response.ok) return response;
      const parsed = parseSimulation(response.value);
      if (parsed.ok && !parsed.value.wouldRevert) simulated.add(fingerprint(req));
      return parsed;
    },

    async execute(req) {
      const preflight = validateRequest(req, options.apiKey);
      if (preflight) return err(preflight);
      if (!simulated.has(fingerprint(req))) {
        return err({ code: "simulation_required", message: "The identical request must pass simulation before execution." });
      }
      const response = await requestJson(fetchFn, sleep, options, endpoint(req), body(req, false), req.correlationId);
      if (!response.ok) return response;
      const parsed = parseSubmitted(response.value);
      if (parsed.ok) simulated.delete(fingerprint(req));
      return parsed;
    },

    async status(executionId) {
      const response = await requestJson(fetchFn, sleep, options, `/api/execute/${encodeURIComponent(executionId)}/status`);
      if (!response.ok) return response;
      return parseStatus(response.value);
    },
  };
}

function validateRequest(req: ExecutionRequest, apiKey: string | null): ExecError | null {
  if (!apiKey) return { code: "auth_missing", message: "KeeperHub API key is missing." };
  if (req.privateRouting) {
    return { code: "private_routing_unsupported", message: "KeeperHub exposes no private-routing opt-in on the verified API surface." };
  }
  return null;
}

function endpoint(req: ExecutionRequest): string {
  if (req.action.kind === "call") return "/api/execute/contract-call";
  if (req.action.kind === "transfer") return "/api/execute/transfer";
  return assertUnsupported(req.action);
}

function body(req: ExecutionRequest, simulate: boolean): Record<string, unknown> {
  if (req.action.kind === "call") {
    return {
      contractAddress: req.action.to,
      chainId: req.chainId,
      functionName: req.action.functionName,
      functionArgs: req.action.functionArgs,
      abi: req.action.abi,
      value: req.action.value,
      simulate,
    };
  }
  return {
    chainId: req.chainId,
    recipientAddress: req.action.to,
    amount: req.action.amount,
    tokenAddress: req.action.token,
    simulate,
  };
}

async function requestJson(
  fetchFn: typeof globalThis.fetch,
  sleep: (milliseconds: number) => Promise<void>,
  options: ClientOptions,
  path: string,
  payload?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<Result<unknown, ExecError>> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const headers = new Headers({ Authorization: `Bearer ${options.apiKey}`, Accept: "application/json" });
      if (payload) headers.set("Content-Type", "application/json");
      if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
      const requestInit: RequestInit = {
        method: payload ? "POST" : "GET",
        headers,
      };
      if (payload) requestInit.body = JSON.stringify(payload);
      const response = await fetchFn(`${options.baseUrl}${path}`, requestInit);
      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        await sleep(100);
        continue;
      }
      const text = await response.text();
      const json: unknown = text ? JSON.parse(text) : null;
      if (!response.ok) return err({ code: "http_error", message: `KeeperHub returned HTTP ${response.status}.`, status: response.status, cause: json });
      return ok(json);
    } catch (cause: unknown) {
      if (attempt === 0) {
        await sleep(100);
        continue;
      }
      return err({ code: "http_error", message: "KeeperHub request failed.", cause });
    }
  }
  return err({ code: "http_error", message: "KeeperHub request failed." });
}

function parseSimulation(value: unknown): Result<Simulation, ExecError> {
  const parsed = simulationSchema.safeParse(value);
  if (!parsed.success) {
    return err({ code: "invalid_response", message: "KeeperHub simulation response did not match the verified contract.", cause: value });
  }
  const simulation: Simulation = {
    status: "simulated",
    gasEstimate: parsed.data.gasEstimate,
    wouldRevert: parsed.data.wouldRevert,
  };
  return typeof parsed.data.revertReason === "string"
    ? ok({ ...simulation, revertReason: parsed.data.revertReason })
    : ok(simulation);
}

function parseSubmitted(value: unknown): Result<Submitted, ExecError> {
  const parsed = submittedSchema.safeParse(value);
  if (!parsed.success) {
    return err({ code: "invalid_response", message: "KeeperHub execute response did not match the verified contract.", cause: value });
  }
  return ok(parsed.data);
}

function parseStatus(value: unknown): Result<ExecutionStatus, ExecError> {
  const parsed = statusSchema.safeParse(value);
  if (!parsed.success) {
    return err({ code: "invalid_response", message: "KeeperHub status response did not match the verified contract.", cause: parsed.error });
  }
  const receipts: ExecutionReceipt[] = [];
  for (const item of parsed.data.receipts) {
    if (!isRecord(item) || typeof item.hash !== "string" || typeof item.chainId !== "number" || typeof item.verified !== "boolean" || typeof item.receiptStatus !== "string") {
      return err({ code: "invalid_response", message: "KeeperHub receipt did not match the verified contract.", cause: item });
    }
    receipts.push({ hash: item.hash, chainId: item.chainId, verified: item.verified, receiptStatus: item.receiptStatus });
  }
  if (parsed.data.status === "completed" && receipts.some((receipt) => !receipt.verified || receipt.receiptStatus !== "success")) {
    return err({ code: "receipt_unverified", message: "KeeperHub reported completion without a verified successful receipt.", cause: receipts });
  }
  const status: ExecutionStatus = {
    executionId: parsed.data.executionId,
    status: parsed.data.status,
    sponsored: parsed.data.sponsored === true,
    receipts,
  };
  return ok({
    ...status,
    ...(typeof parsed.data.transactionHash === "string" ? { transactionHash: parsed.data.transactionHash } : {}),
    ...(typeof parsed.data.transactionLink === "string" ? { transactionLink: parsed.data.transactionLink } : {}),
  });
}

function fingerprint(req: ExecutionRequest): string {
  return JSON.stringify(req);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSubmittedStatus(value: unknown): value is Submitted["status"] {
  return value === "pending" || value === "running" || value === "completed";
}
function isExecutionStatus(value: unknown): value is ExecutionStatus["status"] {
  return value === "pending" || value === "running" || value === "completed" || value === "failed";
}
function assertUnsupported(value: never): never {
  throw new Error(`Unsupported action: ${JSON.stringify(value)}`);
}





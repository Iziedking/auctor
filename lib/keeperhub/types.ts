import type { Result } from "../result.ts";

export type Address = `0x${string}`;

export type ActionSpec =
  | { readonly kind: "call"; readonly to: Address; readonly functionName: string; readonly functionArgs: string; readonly abi?: string; readonly value?: string }
  | { readonly kind: "transfer"; readonly to: Address; readonly amount: string; readonly token?: Address };

export interface ExecutionRequest {
  readonly correlationId: string;
  readonly chainId: string;
  readonly action: ActionSpec;
  readonly privateRouting: boolean;
  readonly maxGasUsd: number;
}

export interface Simulation {
  readonly status: "simulated";
  readonly gasEstimate: string;
  readonly wouldRevert: boolean;
  readonly revertReason?: string;
}

export interface Submitted {
  readonly executionId: string;
  readonly status: "pending" | "running" | "completed";
}

export interface ExecutionReceipt {
  readonly hash: string;
  readonly chainId: number;
  readonly verified: boolean;
  readonly receiptStatus: string;
}

export interface ExecutionStatus {
  readonly executionId: string;
  readonly status: "pending" | "running" | "completed" | "failed";
  readonly sponsored: boolean;
  readonly transactionHash?: string;
  readonly transactionLink?: string;
  readonly receipts: readonly ExecutionReceipt[];
}

export type ExecErrorCode =
  | "auth_missing"
  | "private_routing_unsupported"
  | "simulation_required"
  | "http_error"
  | "invalid_response"
  | "receipt_unverified"
  | "unsupported_action";

export interface ExecError {
  readonly code: ExecErrorCode;
  readonly message: string;
  readonly status?: number;
  readonly cause?: unknown;
}

export interface KeeperHubClient {
  simulate(req: ExecutionRequest): Promise<Result<Simulation, ExecError>>;
  execute(req: ExecutionRequest): Promise<Result<Submitted, ExecError>>;
  status(executionId: string): Promise<Result<ExecutionStatus, ExecError>>;
}

// Fixture-backed KeeperHub preview mode. Source:
// fixtures/keeperhub/base-swap-execution.json, captured 2026-08-06.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { err, ok } from "../result.ts";
import type { ExecutionRequest, KeeperHubClient } from "./types.ts";

interface Fixture {
  readonly source: { readonly executionId: string };
  readonly simulation: { readonly status: "simulated"; readonly gasEstimate: string; readonly wouldRevert: boolean };
  readonly terminal: {
    readonly status: "completed";
    readonly transactionHash: string;
    readonly transactionLink: string;
    readonly sponsored: boolean;
    readonly verified: boolean;
    readonly receiptStatus: string;
    readonly blockNumber: number;
    readonly gasUsed: string;
  };
}

export function createMockKeeperHubClient(
  fixturePath = resolve("fixtures/keeperhub/base-swap-execution.json"),
): KeeperHubClient {
  const source = readFileSync(fixturePath, "utf8").replace(/^\uFEFF/, "");
  const fixture = parseFixture(JSON.parse(source));
  const simulated = new Set<string>();

  return {
    async simulate(req) {
      if (req.privateRouting) {
        return err({ code: "private_routing_unsupported", message: "Private routing is unavailable in mock mode because it is unavailable on the verified KeeperHub surface." });
      }
      simulated.add(fingerprint(req));
      return ok(fixture.simulation);
    },
    async execute(req) {
      if (!simulated.has(fingerprint(req))) {
        return err({ code: "simulation_required", message: "The identical request must pass simulation before execution." });
      }
      simulated.delete(fingerprint(req));
      return ok({ executionId: fixture.source.executionId, status: "completed" });
    },
    async status(executionId) {
      if (executionId !== fixture.source.executionId) {
        return err({ code: "invalid_response", message: `Unknown mock execution id: ${executionId}` });
      }
      return ok({
        executionId,
        status: fixture.terminal.status,
        sponsored: fixture.terminal.sponsored,
        transactionHash: fixture.terminal.transactionHash,
        transactionLink: fixture.terminal.transactionLink,
        receipts: [{
          hash: fixture.terminal.transactionHash,
          chainId: 8453,
          verified: fixture.terminal.verified,
          receiptStatus: fixture.terminal.receiptStatus,
        }],
      });
    },
  };
}

function parseFixture(value: unknown): Fixture {
  if (!isRecord(value) || !isRecord(value.source) || typeof value.source.executionId !== "string"
    || !isRecord(value.simulation) || value.simulation.status !== "simulated"
    || typeof value.simulation.gasEstimate !== "string" || typeof value.simulation.wouldRevert !== "boolean"
    || !isRecord(value.terminal) || value.terminal.status !== "completed"
    || typeof value.terminal.transactionHash !== "string" || typeof value.terminal.transactionLink !== "string"
    || typeof value.terminal.sponsored !== "boolean" || typeof value.terminal.verified !== "boolean"
    || typeof value.terminal.receiptStatus !== "string" || typeof value.terminal.blockNumber !== "number"
    || typeof value.terminal.gasUsed !== "string") {
    throw new Error("KeeperHub mock fixture does not match the verified P0 shape.");
  }
  return value as unknown as Fixture;
}

function fingerprint(req: ExecutionRequest): string {
  return JSON.stringify(req);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}


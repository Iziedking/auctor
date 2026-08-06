// KeeperHub MCP HTTP contract. Verified against https://app.keeperhub.com/mcp
// through captured responses; this harness deliberately preserves raw payloads.
// Read 2026-08-06. No KeeperHub SDK was available.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type JsonPrimitive = boolean | number | string | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: { [key: string]: JsonValue };
}

interface ToolCall {
  name: string;
  arguments?: { [key: string]: JsonValue };
  fixture: string;
}

const endpoint = process.env.KEEPERHUB_MCP_URL ?? "https://app.keeperhub.com/mcp";
const apiKey = process.env.KEEPERHUB_ACME_API_KEY;
const callsFile = process.env.KEEPERHUB_CALLS_FILE ?? "scripts/keeperhub-calls.json";
const rawFixtureDirectory = resolve("fixtures/keeperhub/raw");

if (!apiKey) {
  console.error("KEEPERHUB_ACME_API_KEY is missing. No network request was made.");
  process.exitCode = 1;
} else {
  await run(apiKey);
}

async function run(bearerToken: string): Promise<void> {
  await mkdir(rawFixtureDirectory, { recursive: true });

  const initialized = await sendMcpRequest(bearerToken, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "auctor-verifier", version: "0.0.0" },
    },
  });
  await saveRawFixture("initialize.json", initialized.body);

  const tools = await sendMcpRequest(bearerToken, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  }, initialized.sessionId);
  await saveRawFixture("tools-list.json", tools.body);
  console.log(`KeeperHub tool discovery: HTTP ${tools.status}`);
  console.log(tools.body);

  const calls = await loadToolCalls();
  let requestId = 3;
  for (const call of calls) {
    const response = await sendMcpRequest(bearerToken, {
      jsonrpc: "2.0",
      id: requestId,
      method: "tools/call",
      params: { name: call.name, arguments: call.arguments ?? {} },
    }, initialized.sessionId);
    await saveRawFixture(call.fixture, response.body);
    console.log(`${call.name}: HTTP ${response.status} -> ${call.fixture}`);
    requestId += 1;
  }
}

async function sendMcpRequest(
  bearerToken: string,
  request: JsonRpcRequest,
  sessionId?: string,
): Promise<{ body: string; sessionId?: string; status: number }> {
  const headers = new Headers({
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${bearerToken}`,
    "Content-Type": "application/json",
  });
  if (sessionId) {
    headers.set("Mcp-Session-Id", sessionId);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.text();
  const nextSessionId = response.headers.get("mcp-session-id") ?? sessionId;

  if (!response.ok) {
    throw new Error(`KeeperHub MCP ${request.method} failed with HTTP ${response.status}: ${body}`);
  }

  return nextSessionId ? { body, sessionId: nextSessionId, status: response.status } : { body, status: response.status };
}

async function loadToolCalls(): Promise<ToolCall[]> {
  try {
    const source = await readFile(resolve(callsFile), "utf8");
    const parsed: unknown = JSON.parse(source);
    if (!Array.isArray(parsed)) {
      throw new Error("the root value must be an array");
    }
    return parsed.map(parseToolCall);
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      console.log(`No ${callsFile} file found. Tool discovery only.`);
      return [];
    }
    throw error;
  }
}

function parseToolCall(value: unknown, index: number): ToolCall {
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.fixture !== "string") {
    throw new Error(`Tool call ${index} must contain string name and fixture fields.`);
  }
  if (value.arguments !== undefined && !isRecord(value.arguments)) {
    throw new Error(`Tool call ${index} arguments must be an object.`);
  }
  const call: ToolCall = {
    name: value.name,
    fixture: safeFixtureName(value.fixture),
  };
  return value.arguments === undefined
    ? call
    : { ...call, arguments: value.arguments as { [key: string]: JsonValue } };
}

function safeFixtureName(value: string): string {
  if (!/^[a-z0-9][a-z0-9._-]*\.json$/i.test(value)) {
    throw new Error(`Unsafe fixture name: ${value}`);
  }
  return value;
}

async function saveRawFixture(name: string, body: string): Promise<void> {
  await writeFile(resolve(rawFixtureDirectory, name), `${body}\n`, "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFileError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}


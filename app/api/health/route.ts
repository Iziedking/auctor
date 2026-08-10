import { NextResponse } from "next/server";
import { loadConfig, runtimeEnvironment } from "../../../lib/config.ts";
import { buildCapabilityHealth } from "../../../lib/health.ts";
import { createMemoryClient } from "../../../lib/memory/client.ts";

export async function GET() {
  const config = loadConfig(runtimeEnvironment());
  const memory = config.capabilities.memory ? createMemoryClient({ baseUrl: config.memory.url }) : undefined;
  const health = await buildCapabilityHealth(config, memory);
  return NextResponse.json(health);
}

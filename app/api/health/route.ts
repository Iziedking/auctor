import { NextResponse } from "next/server";
import { loadConfig, runtimeEnvironment } from "../../../lib/config.ts";
import { buildCapabilityHealth } from "../../../lib/health.ts";
import { createMemoryClient } from "../../../lib/memory/client.ts";

export async function GET() {
  if(process.env.AUCTOR_E2E_AUTH==="1")return NextResponse.json({status:"ok",mode:"mock",database:"configured",execution:"configured",memory:{state:"available",bufferedLocal:0,cachedLocal:2,quilts:1},llm:"configured",approval:{mode:"fixture",available:true}});
  const config = loadConfig(runtimeEnvironment());
  const memory = config.capabilities.memory ? createMemoryClient({ baseUrl: config.memory.url }) : undefined;
  const health = await buildCapabilityHealth(config, memory);
  return NextResponse.json(health);
}

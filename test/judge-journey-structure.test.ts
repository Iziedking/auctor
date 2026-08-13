import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
const read=(path:string)=>readFile(new URL("../"+path,import.meta.url),"utf8");
test("Agent and Settings own different product responsibilities",async()=>{assert.match(await read("app/agent/page.tsx"),/AgentOverview/);assert.doesNotMatch(await read("app/agent/page.tsx"),/AgentSetup/);assert.match(await read("app/settings/page.tsx"),/AgentSettings/)});
test("Audit uses the backend boundary instead of frontend-local database configuration",async()=>{const source=await read("app/audit/page.tsx");assert.match(source,/createHttpAuditSource/);assert.doesNotMatch(source,/createDatabase|DATABASE_URL|loadConfig/)});
test("first-time onboarding has a dedicated product route",async()=>{assert.match(await read("app/onboarding/page.tsx"),/AgentOnboarding/);assert.match(await read("app/api/agent/onboarding/route.ts"),/onboardingCompletedAt/)});

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { validateAgentSetup } from "../../../lib/agent/setup.ts";
import { hashToken } from "../../../lib/auth/email.ts";
import { loadConfig, runtimeEnvironment } from "../../../lib/config.ts";
import { resolveSession } from "../../../lib/db/auth-repository.ts";
import { createDatabase } from "../../../lib/db/client.ts";
import { agents } from "../../../lib/db/schema.ts";
async function context(){const token=(await cookies()).get("auctor_session")?.value;if(!token)return null;const config=loadConfig(runtimeEnvironment());if(!config.database.url)return null;const database=createDatabase(config.database.url);const session=await resolveSession(database.db,hashToken(token));return session?{database,session}:null}
export async function GET(){const ctx=await context();if(!ctx)return NextResponse.json({error:"unauthorized"},{status:401});try{const rows=await ctx.database.db.select().from(agents).where(and(eq(agents.id,ctx.session.agentId),eq(agents.userId,ctx.session.userId))).limit(1);return NextResponse.json(rows[0])}finally{await ctx.database.close()}}
export async function PUT(request:Request){const ctx=await context();if(!ctx)return NextResponse.json({error:"unauthorized"},{status:401});try{const setup=validateAgentSetup(await request.json());const rows=await ctx.database.db.update(agents).set({name:setup.name,autonomyMode:setup.autonomyMode,approvalMode:setup.autonomyMode==="manual"?"approve":"autonomous",budgetUsd:String(setup.budgetUsd),dailyCapUsd:String(setup.dailyCapUsd),perTradeCapUsd:String(setup.perTradeCapUsd),allowedChains:[...setup.allowedChains],allowedTokens:[...setup.allowedTokens],maxSlippageBps:setup.maxSlippageBps}).where(and(eq(agents.id,ctx.session.agentId),eq(agents.userId,ctx.session.userId))).returning();return NextResponse.json(rows[0])}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"invalid_setup"},{status:400})}finally{await ctx.database.close()}}
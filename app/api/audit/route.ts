import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hashToken } from "../../../lib/auth/email.ts";
import { createDatabaseAuditSource } from "../../../lib/audit/database-source.ts";
import { createFixtureAuditSource } from "../../../lib/audit/source.ts";
import { loadConfig, runtimeEnvironment } from "../../../lib/config.ts";
import { resolveSession } from "../../../lib/db/auth-repository.ts";
import { createDatabase } from "../../../lib/db/client.ts";
export async function GET(request:Request){const url=new URL(request.url);const status=url.searchParams.get("status")as any;const chainId=url.searchParams.get("chainId")??undefined;const search=url.searchParams.get("search")??undefined;const query={...(status?{status}:{}),...(chainId?{chainId}:{}),...(search?{search}:{})};if(process.env.AUCTOR_E2E_AUTH==="1"){const result=await createFixtureAuditSource().list(query);return NextResponse.json({items:result.kind==="ready"?result.value:[]})}const token=(await cookies()).get("auctor_session")?.value;if(!token)return NextResponse.json({error:"unauthorized"},{status:401});const config=loadConfig(runtimeEnvironment());if(!config.database.url)return NextResponse.json({error:"audit_unavailable"},{status:503});const database=createDatabase(config.database.url);try{const session=await resolveSession(database.db,hashToken(token));if(!session)return NextResponse.json({error:"unauthorized"},{status:401});const result=await createDatabaseAuditSource(database.db,session.agentId,session.agentName).list(query);return NextResponse.json({items:result.kind==="ready"?result.value:[]})}finally{await database.close()}}

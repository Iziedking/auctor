import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hashToken } from "../../../../lib/auth/email.ts";
import { loadConfig, runtimeEnvironment } from "../../../../lib/config.ts";
import { createDatabase } from "../../../../lib/db/client.ts";
import { resolveSession } from "../../../../lib/db/auth-repository.ts";
export async function GET(){const token=(await cookies()).get("auctor_session")?.value;if(!token)return NextResponse.json({authenticated:false},{status:401});const config=loadConfig(runtimeEnvironment());if(!config.database.url)return NextResponse.json({error:"database_unavailable"},{status:503});const database=createDatabase(config.database.url);try{const session=await resolveSession(database.db,hashToken(token));return session?NextResponse.json({authenticated:true,...session}):NextResponse.json({authenticated:false},{status:401})}finally{await database.close()}}
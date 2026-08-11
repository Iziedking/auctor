import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const jar = await cookies();
  jar.set("auctor_session", "", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}

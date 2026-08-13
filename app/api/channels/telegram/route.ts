import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createChannelPairingService } from "../../../../lib/auth/channel-service.ts";
import { hashToken } from "../../../../lib/auth/email.ts";
import { loadConfig, runtimeEnvironment } from "../../../../lib/config.ts";
import { resolveSession } from "../../../../lib/db/auth-repository.ts";
import { channelConnections } from "../../../../lib/db/schema.ts";
import { createDrizzleChannelPairingRepository } from "../../../../lib/db/channel-pairing-repository.ts";
import { createDatabase } from "../../../../lib/db/client.ts";
async function context() {
  const token = (await cookies()).get("auctor_session")?.value;
  if (!token) return null;
  const config = loadConfig(runtimeEnvironment());
  if (!config.database.url) return null;
  const database = createDatabase(config.database.url);
  const session = await resolveSession(database.db, hashToken(token));
  return session ? { database, session, config } : null;
}
export async function GET() {
  const ctx = await context();
  if (!ctx)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const rows = await ctx.database.db
      .select({
        externalIdentity: channelConnections.externalIdentity,
        createdAt: channelConnections.createdAt,
      })
      .from(channelConnections)
      .where(
        and(
          eq(channelConnections.agentId, ctx.session.agentId),
          eq(channelConnections.provider, "telegram"),
        ),
      )
      .limit(1);
    return NextResponse.json({
      connected: Boolean(rows[0]),
      connection: rows[0] ?? null,
      botUsername: process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ?? null,
    });
  } finally {
    await ctx.database.close();
  }
}
export async function POST() {
  const ctx = await context();
  if (!ctx)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    if (!ctx.config.notifications.telegramToken)
      return NextResponse.json(
        { error: "telegram_not_configured" },
        { status: 503 },
      );
    const service = createChannelPairingService({
      repository: createDrizzleChannelPairingRepository(ctx.database.db),
    });
    const issued = await service.issue({
      userId: ctx.session.userId,
      agentId: ctx.session.agentId,
      provider: "telegram",
    });
    return NextResponse.json({
      code: issued.code,
      expiresAt: issued.expiresAt,
      botUsername: process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ?? null,
      deepLink: process.env.TELEGRAM_BOT_USERNAME ? `https://t.me/${process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, "")}?start=${issued.code}` : null,
    });
  } finally {
    await ctx.database.close();
  }
}
export async function DELETE() {
  const ctx = await context();
  if (!ctx)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await ctx.database.db
      .delete(channelConnections)
      .where(
        and(
          eq(channelConnections.agentId, ctx.session.agentId),
          eq(channelConnections.provider, "telegram"),
        ),
      );
    return NextResponse.json({ disconnected: true });
  } finally {
    await ctx.database.close();
  }
}

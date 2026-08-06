import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";
export function createDatabase(databaseUrl: string) {
  const connection = postgres(databaseUrl, { prepare: false, max: 10 });
  return { db: drizzle(connection, { schema }), async close(): Promise<void> { await connection.end(); } };
}

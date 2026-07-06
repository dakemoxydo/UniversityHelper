import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

function normalizeDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");

    if (parsed.hostname.includes("neon.tech")) {
      const sslMode = parsed.searchParams.get("sslmode");

      if (!sslMode || sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
        parsed.searchParams.set("sslmode", "verify-full");
      }
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

const globalForDb = globalThis as typeof globalThis & {
  __universityHelperPool?: Pool;
};

export const pool =
  databaseUrl &&
  (globalForDb.__universityHelperPool ??
    new Pool({
      connectionString: normalizeDatabaseUrl(databaseUrl),
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    }));

if (process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__universityHelperPool = pool;
}

export const db = pool ? drizzle(pool, { schema }) : null;

export function requireDb() {
  if (!db) {
    throw new Error("DATABASE_URL is required to use persistent storage.");
  }

  return db;
}
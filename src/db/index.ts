import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __universityHelperPool?: Pool;
};

export const pool =
  databaseUrl &&
  (globalForDb.__universityHelperPool ??
    new Pool({
      connectionString: databaseUrl,
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

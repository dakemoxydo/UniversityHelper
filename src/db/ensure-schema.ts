import { pool } from "@/db";

let ensurePromise: Promise<void> | null = null;

const schemaSql = `
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "login" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_login_unique" ON "users" ("login");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_hash_unique" ON "sessions" ("token_hash");

CREATE TABLE IF NOT EXISTS "profiles" (
  "user_id" integer PRIMARY KEY,
  "exam_subjects" jsonb,
  "priority_order" jsonb,
  "disabled_criteria" jsonb,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "universities" (
  "id" serial PRIMARY KEY,
  "user_id" integer,
  "name" text NOT NULL,
  "city" text NOT NULL DEFAULT '',
  "has_military_department" boolean NOT NULL DEFAULT false,
  "has_dormitory" boolean NOT NULL DEFAULT false,
  "commute_minutes" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "universities" ADD COLUMN IF NOT EXISTS "user_id" integer;

CREATE TABLE IF NOT EXISTS "specialties" (
  "id" serial PRIMARY KEY,
  "university_id" integer NOT NULL,
  "name" text NOT NULL,
  "direction" text NOT NULL DEFAULT '',
  "admission_basis" text NOT NULL DEFAULT 'both',
  "tuition_cost" integer NOT NULL DEFAULT 0,
  "budget_seats" integer NOT NULL DEFAULT 0,
  "budget_passing_score" integer NOT NULL DEFAULT 0,
  "budget_average_score" integer NOT NULL DEFAULT 0,
  "budget_max_score" integer NOT NULL DEFAULT 0,
  "paid_seats" integer NOT NULL DEFAULT 0,
  "paid_passing_score" integer NOT NULL DEFAULT 0,
  "paid_average_score" integer NOT NULL DEFAULT 0,
  "paid_max_score" integer NOT NULL DEFAULT 0
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_users_id_fk') THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_users_id_fk') THEN
    ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'universities_user_id_users_id_fk') THEN
    ALTER TABLE "universities" ADD CONSTRAINT "universities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'specialties_university_id_universities_id_fk') THEN
    ALTER TABLE "specialties" ADD CONSTRAINT "specialties_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE cascade;
  END IF;
END $$;
`;

export async function ensureDatabaseSchema() {
  if (!pool) {
    throw new Error("DATABASE_URL is required to initialize database schema.");
  }

  ensurePromise ??= pool.query(schemaSql).then(() => undefined);

  try {
    await ensurePromise;
  } catch (error) {
    ensurePromise = null;
    throw error;
  }
}
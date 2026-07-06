DELETE FROM "universities" WHERE "user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "universities" ALTER COLUMN "user_id" SET NOT NULL;
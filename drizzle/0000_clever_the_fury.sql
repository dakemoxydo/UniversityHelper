CREATE TABLE "specialties" (
	"id" serial PRIMARY KEY NOT NULL,
	"university_id" integer NOT NULL,
	"name" text NOT NULL,
	"direction" text DEFAULT '' NOT NULL,
	"admission_basis" text DEFAULT 'both' NOT NULL,
	"tuition_cost" integer DEFAULT 0 NOT NULL,
	"budget_seats" integer DEFAULT 0 NOT NULL,
	"budget_passing_score" integer DEFAULT 0 NOT NULL,
	"budget_average_score" integer DEFAULT 0 NOT NULL,
	"budget_max_score" integer DEFAULT 0 NOT NULL,
	"paid_seats" integer DEFAULT 0 NOT NULL,
	"paid_passing_score" integer DEFAULT 0 NOT NULL,
	"paid_average_score" integer DEFAULT 0 NOT NULL,
	"paid_max_score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"has_military_department" boolean DEFAULT false NOT NULL,
	"has_dormitory" boolean DEFAULT false NOT NULL,
	"commute_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "specialties" ADD CONSTRAINT "specialties_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;
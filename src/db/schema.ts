import { boolean, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    login: text("login").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    loginIdx: uniqueIndex("users_login_unique").on(table.login),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
  }),
);

export const profiles = pgTable("profiles", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  examSubjects: jsonb("exam_subjects"),
  priorityOrder: jsonb("priority_order"),
  disabledCriteria: jsonb("disabled_criteria"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const universities = pgTable("universities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  hasMilitaryDepartment: boolean("has_military_department").notNull().default(false),
  hasDormitory: boolean("has_dormitory").notNull().default(false),
  commuteMinutes: integer("commute_minutes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const specialties = pgTable("specialties", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id")
    .notNull()
    .references(() => universities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  direction: text("direction").notNull().default(""),
  admissionBasis: text("admission_basis").notNull().default("both"),
  tuitionCost: integer("tuition_cost").notNull().default(0),
  budgetSeats: integer("budget_seats").notNull().default(0),
  budgetPassingScore: integer("budget_passing_score").notNull().default(0),
  budgetAverageScore: integer("budget_average_score").notNull().default(0),
  budgetMaxScore: integer("budget_max_score").notNull().default(0),
  paidSeats: integer("paid_seats").notNull().default(0),
  paidPassingScore: integer("paid_passing_score").notNull().default(0),
  paidAverageScore: integer("paid_average_score").notNull().default(0),
  paidMaxScore: integer("paid_max_score").notNull().default(0),
});

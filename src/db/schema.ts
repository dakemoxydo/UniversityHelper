import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const universities = pgTable("universities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  hasMilitaryDepartment: boolean("has_military_department").notNull().default(false),
  hasDormitory: boolean("has_dormitory").notNull().default(false),
  commuteMinutes: integer("commute_minutes").notNull(),
  olympiadBenefit: text("olympiad_benefit").notNull().default("none"),
  extraPoints: integer("extra_points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const specialties = pgTable("specialties", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id")
    .notNull()
    .references(() => universities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  passingScore: integer("passing_score").notNull(),
  tuitionCost: integer("tuition_cost").notNull(),
  budgetSeats: integer("budget_seats").notNull().default(0),
  paidSeats: integer("paid_seats").notNull().default(0),
  interestScore: integer("interest_score").notNull().default(3),
  careerScore: integer("career_score").notNull().default(3),
});

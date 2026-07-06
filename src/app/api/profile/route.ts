import { requireDb } from "@/db";
import { profiles } from "@/db/schema";
import { databaseErrorResponse } from "@/lib/api-responses";
import { getCurrentUser } from "@/lib/auth";
import { defaultPriorityOrder, normalizeDisabledCriteria, normalizePriorityOrder, type CriteriaKey } from "@/lib/university-calculator";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ExamSubjectScore = {
  id: string;
  subject: string;
  score: number;
};

const defaultExamSubjects: ExamSubjectScore[] = [
  { id: "exam-russian", subject: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439 \u044f\u0437\u044b\u043a", score: 80 },
  { id: "exam-math", subject: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c\u043d\u0430\u044f \u043c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u043a\u0430", score: 80 },
  { id: "exam-third", subject: "\u0418\u043d\u0444\u043e\u0440\u043c\u0430\u0442\u0438\u043a\u0430", score: 80 },
];

function cleanExamSubjects(value: unknown): ExamSubjectScore[] {
  if (!Array.isArray(value)) {
    return defaultExamSubjects;
  }

  const clean = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const source = item as Partial<ExamSubjectScore>;
      const id = typeof source.id === "string" && source.id.trim() ? source.id.trim().slice(0, 80) : `exam-${Date.now()}`;
      const subject = typeof source.subject === "string" ? source.subject.trim().slice(0, 80) : "";
      const score = Math.max(0, Math.min(100, Math.round(Number(source.score) || 0)));

      return subject ? { id, subject, score } : null;
    })
    .filter((item): item is ExamSubjectScore => item !== null)
    .slice(0, 5);

  return clean.length >= 3 ? clean : defaultExamSubjects;
}

function cleanPriorityOrder(value: unknown) {
  return normalizePriorityOrder(Array.isArray(value) ? (value as CriteriaKey[]) : defaultPriorityOrder);
}

function cleanDisabledCriteria(value: unknown) {
  return normalizeDisabledCriteria(Array.isArray(value) ? (value as CriteriaKey[]) : []);
}

function profileResult(profile: typeof profiles.$inferSelect | undefined) {
  return {
    examSubjects: cleanExamSubjects(profile?.examSubjects),
    priorityOrder: cleanPriorityOrder(profile?.priorityOrder),
    disabledCriteria: cleanDisabledCriteria(profile?.disabledCriteria),
  };
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "\u041d\u0443\u0436\u043d\u043e \u0432\u043e\u0439\u0442\u0438 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442." }, { status: 401 });
}

export async function GET() {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
  } catch {
    return NextResponse.json({ error: "DATABASE_URL \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d." }, { status: 503 });
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const [profile] = await database.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
    return NextResponse.json({ profile: profileResult(profile) });
  } catch (error) {
    return databaseErrorResponse(error, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c.", "profile.get");
  }
}

export async function PUT(request: Request) {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
  } catch {
    return NextResponse.json({ error: "DATABASE_URL \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d." }, { status: 503 });
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const body = (await request.json().catch(() => null)) as {
      examSubjects?: unknown;
      priorityOrder?: unknown;
      disabledCriteria?: unknown;
    } | null;
    const profile = profileResult({
      userId: user.id,
      examSubjects: body?.examSubjects ?? defaultExamSubjects,
      priorityOrder: body?.priorityOrder ?? defaultPriorityOrder,
      disabledCriteria: body?.disabledCriteria ?? [],
      updatedAt: new Date(),
    });

    await database
      .insert(profiles)
      .values({
        userId: user.id,
        examSubjects: profile.examSubjects,
        priorityOrder: profile.priorityOrder,
        disabledCriteria: profile.disabledCriteria,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          examSubjects: profile.examSubjects,
          priorityOrder: profile.priorityOrder,
          disabledCriteria: profile.disabledCriteria,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ profile });
  } catch (error) {
    return databaseErrorResponse(error, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c.", "profile.put");
  }
}
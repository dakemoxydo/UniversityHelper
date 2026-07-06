import { requireDb } from "@/db";
import { databaseErrorResponse } from "@/lib/api-responses";
import { getCurrentUser } from "@/lib/auth";
import { specialties, universities } from "@/db/schema";
import type { AdmissionBasis, SpecialtyInput, University, UniversityInput } from "@/lib/university-calculator";
import { and, asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const admissionBases = new Set<AdmissionBasis>(["budget", "paid", "both"]);

function toIntegerInRange(value: unknown, min: number, max: number, fallback = min) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function textValue(value: unknown, fallback = "", maxLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function scoreValue(value: unknown) {
  return toIntegerInRange(value, 0, 500);
}

function validateAdmissionBasis(value: unknown): AdmissionBasis {
  return typeof value === "string" && admissionBases.has(value as AdmissionBasis) ? (value as AdmissionBasis) : "both";
}

function validateSpecialty(input: Partial<SpecialtyInput> & { passingScore?: unknown }): SpecialtyInput | null {
  const name = textValue(input.name);

  if (!name) {
    return null;
  }

  const admissionBasis = validateAdmissionBasis(input.admissionBasis);
  const legacyPassingScore = scoreValue(input.passingScore);

  const id = toIntegerInRange(input.id, 1, Number.MAX_SAFE_INTEGER, 0);

  return {
    ...(id ? { id } : {}),
    name: name.slice(0, 160),
    direction: textValue(input.direction, "", 180),
    admissionBasis,
    tuitionCost: admissionBasis === "budget" ? 0 : toIntegerInRange(input.tuitionCost, 0, 5_000_000),
    budgetSeats: admissionBasis === "paid" ? 0 : toIntegerInRange(input.budgetSeats, 0, 10_000),
    budgetPassingScore: admissionBasis === "paid" ? 0 : scoreValue(input.budgetPassingScore ?? legacyPassingScore),
    budgetAverageScore: admissionBasis === "paid" ? 0 : scoreValue(input.budgetAverageScore ?? legacyPassingScore),
    budgetMaxScore: admissionBasis === "paid" ? 0 : scoreValue(input.budgetMaxScore ?? legacyPassingScore),
    paidSeats: admissionBasis === "budget" ? 0 : toIntegerInRange(input.paidSeats, 0, 10_000),
    paidPassingScore: admissionBasis === "budget" ? 0 : scoreValue(input.paidPassingScore ?? legacyPassingScore),
    paidAverageScore: admissionBasis === "budget" ? 0 : scoreValue(input.paidAverageScore ?? legacyPassingScore),
    paidMaxScore: admissionBasis === "budget" ? 0 : scoreValue(input.paidMaxScore ?? legacyPassingScore),
  };
}

function validatePayload(payload: unknown): UniversityInput | { error: string } {
  if (!payload || typeof payload !== "object") {
    return { error: "Некорректный формат данных." };
  }

  const source = payload as Partial<UniversityInput>;
  const name = textValue(source.name);

  if (name.length < 2) {
    return { error: "Введите название университета." };
  }

  const cleanSpecialties = (Array.isArray(source.specialties) ? source.specialties : [])
    .map((specialty) => validateSpecialty(specialty))
    .filter((specialty): specialty is SpecialtyInput => specialty !== null);

  if (cleanSpecialties.length === 0) {
    return { error: "Добавьте хотя бы один профиль обучения." };
  }

  if (cleanSpecialties.length > 8) {
    return { error: "Можно добавить не больше восьми профилей за один раз." };
  }

  return {
    name: name.slice(0, 160),
    city: textValue(source.city, "", 80),
    hasMilitaryDepartment: Boolean(source.hasMilitaryDepartment),
    hasDormitory: Boolean(source.hasDormitory),
    commuteMinutes: toIntegerInRange(source.commuteMinutes, 0, 360),
    specialties: cleanSpecialties,
  };
}

function databaseUnavailableResponse() {
  return NextResponse.json(
    {
      error: "Не настроен DATABASE_URL. Добавьте переменную окружения или используйте локальный черновик в браузере.",
      universities: [],
    },
    { status: 503 },
  );
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
}

function specialtyResult(specialty: typeof specialties.$inferSelect) {
  return {
    id: specialty.id,
    universityId: specialty.universityId,
    name: specialty.name,
    direction: specialty.direction,
    admissionBasis: validateAdmissionBasis(specialty.admissionBasis),
    tuitionCost: specialty.tuitionCost,
    budgetSeats: specialty.budgetSeats,
    budgetPassingScore: specialty.budgetPassingScore,
    budgetAverageScore: specialty.budgetAverageScore,
    budgetMaxScore: specialty.budgetMaxScore,
    paidSeats: specialty.paidSeats,
    paidPassingScore: specialty.paidPassingScore,
    paidAverageScore: specialty.paidAverageScore,
    paidMaxScore: specialty.paidMaxScore,
  };
}

function specialtyValues(universityId: number, specialty: SpecialtyInput) {
  return {
    universityId,
    name: specialty.name,
    direction: specialty.direction,
    admissionBasis: specialty.admissionBasis,
    tuitionCost: specialty.tuitionCost,
    budgetSeats: specialty.budgetSeats,
    budgetPassingScore: specialty.budgetPassingScore,
    budgetAverageScore: specialty.budgetAverageScore,
    budgetMaxScore: specialty.budgetMaxScore,
    paidSeats: specialty.paidSeats,
    paidPassingScore: specialty.paidPassingScore,
    paidAverageScore: specialty.paidAverageScore,
    paidMaxScore: specialty.paidMaxScore,
  };
}

async function saveSpecialties(tx: Pick<ReturnType<typeof requireDb>, "insert">, universityId: number, inputSpecialties: SpecialtyInput[]) {
  if (inputSpecialties.length === 0) {
    return [];
  }

  return tx
    .insert(specialties)
    .values(
      inputSpecialties.map((specialty) => specialtyValues(universityId, specialty)),
    )
    .returning();
}

function universityResult(university: typeof universities.$inferSelect, insertedSpecialties: Array<typeof specialties.$inferSelect>): University {
  return {
    id: university.id,
    name: university.name,
    city: university.city,
    hasMilitaryDepartment: university.hasMilitaryDepartment,
    hasDormitory: university.hasDormitory,
    commuteMinutes: university.commuteMinutes,
    createdAt: university.createdAt.toISOString(),
    specialties: insertedSpecialties.map(specialtyResult),
  };
}

export async function GET() {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
  } catch {
    return databaseUnavailableResponse();
  }

  let user: Awaited<ReturnType<typeof getCurrentUser>>;

  try {
    user = await getCurrentUser();
  } catch (error) {
    return databaseErrorResponse(error, "Не удалось проверить сессию.");
  }

  if (!user) {
    return unauthorizedResponse();
  }

  const rows = await database
    .select({
      universityId: universities.id,
      universityName: universities.name,
      city: universities.city,
      hasMilitaryDepartment: universities.hasMilitaryDepartment,
      hasDormitory: universities.hasDormitory,
      commuteMinutes: universities.commuteMinutes,
      createdAt: universities.createdAt,
      specialtyId: specialties.id,
      specialtyUniversityId: specialties.universityId,
      specialtyName: specialties.name,
      direction: specialties.direction,
      admissionBasis: specialties.admissionBasis,
      tuitionCost: specialties.tuitionCost,
      budgetSeats: specialties.budgetSeats,
      budgetPassingScore: specialties.budgetPassingScore,
      budgetAverageScore: specialties.budgetAverageScore,
      budgetMaxScore: specialties.budgetMaxScore,
      paidSeats: specialties.paidSeats,
      paidPassingScore: specialties.paidPassingScore,
      paidAverageScore: specialties.paidAverageScore,
      paidMaxScore: specialties.paidMaxScore,
    })
    .from(universities)
    .leftJoin(specialties, eq(specialties.universityId, universities.id))
    .where(eq(universities.userId, user.id))
    .orderBy(desc(universities.createdAt), asc(specialties.id));

  const grouped = new Map<number, University>();

  for (const row of rows) {
    const university = grouped.get(row.universityId) ?? {
      id: row.universityId,
      name: row.universityName,
      city: row.city,
      hasMilitaryDepartment: row.hasMilitaryDepartment,
      hasDormitory: row.hasDormitory,
      commuteMinutes: row.commuteMinutes,
      createdAt: row.createdAt.toISOString(),
      specialties: [],
    };

    if (row.specialtyId && row.specialtyUniversityId && row.specialtyName) {
      university.specialties.push({
        id: row.specialtyId,
        universityId: row.specialtyUniversityId,
        name: row.specialtyName,
        direction: row.direction ?? "",
        admissionBasis: validateAdmissionBasis(row.admissionBasis),
        tuitionCost: row.tuitionCost ?? 0,
        budgetSeats: row.budgetSeats ?? 0,
        budgetPassingScore: row.budgetPassingScore ?? 0,
        budgetAverageScore: row.budgetAverageScore ?? 0,
        budgetMaxScore: row.budgetMaxScore ?? 0,
        paidSeats: row.paidSeats ?? 0,
        paidPassingScore: row.paidPassingScore ?? 0,
        paidAverageScore: row.paidAverageScore ?? 0,
        paidMaxScore: row.paidMaxScore ?? 0,
      });
    }

    grouped.set(row.universityId, university);
  }

  return NextResponse.json({ universities: Array.from(grouped.values()) });
}

export async function POST(request: NextRequest) {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
  } catch {
    return databaseUnavailableResponse();
  }

  let user: Awaited<ReturnType<typeof getCurrentUser>>;

  try {
    user = await getCurrentUser();
  } catch (error) {
    return databaseErrorResponse(error, "Не удалось проверить сессию.");
  }

  if (!user) {
    return unauthorizedResponse();
  }

  const payload = validatePayload(await request.json());

  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const created = await database.transaction(async (tx) => {
    const [university] = await tx
      .insert(universities)
      .values({
        userId: user.id,
        name: payload.name,
        city: payload.city,
        hasMilitaryDepartment: payload.hasMilitaryDepartment,
        hasDormitory: payload.hasDormitory,
        commuteMinutes: payload.commuteMinutes,
      })
      .returning();

    const insertedSpecialties = await saveSpecialties(tx, university.id, payload.specialties);

    return universityResult(university, insertedSpecialties);
  });

  return NextResponse.json({ university: created }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
  } catch {
    return databaseUnavailableResponse();
  }

  let user: Awaited<ReturnType<typeof getCurrentUser>>;

  try {
    user = await getCurrentUser();
  } catch (error) {
    return databaseErrorResponse(error, "Не удалось проверить сессию.");
  }

  if (!user) {
    return unauthorizedResponse();
  }

  const id = Number(request.nextUrl.searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Некорректный идентификатор ВУЗа." }, { status: 400 });
  }

  const payload = validatePayload(await request.json());

  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const updated = await database.transaction(async (tx) => {
    const [university] = await tx
      .update(universities)
      .set({
        name: payload.name,
        city: payload.city,
        hasMilitaryDepartment: payload.hasMilitaryDepartment,
        hasDormitory: payload.hasDormitory,
        commuteMinutes: payload.commuteMinutes,
      })
      .where(and(eq(universities.id, id), eq(universities.userId, user.id)))
      .returning();

    if (!university) {
      return null;
    }

    const existingSpecialties = await tx.select().from(specialties).where(eq(specialties.universityId, id));
    const existingIds = new Set(existingSpecialties.map((specialty) => specialty.id));
    const keptIds = new Set<number>();
    const savedSpecialties: Array<typeof specialties.$inferSelect> = [];

    for (const specialty of payload.specialties) {
      if (specialty.id && existingIds.has(specialty.id)) {
        const [updatedSpecialty] = await tx
          .update(specialties)
          .set(specialtyValues(university.id, specialty))
          .where(eq(specialties.id, specialty.id))
          .returning();

        if (updatedSpecialty) {
          keptIds.add(updatedSpecialty.id);
          savedSpecialties.push(updatedSpecialty);
        }
      } else {
        const [insertedSpecialty] = await tx.insert(specialties).values(specialtyValues(university.id, specialty)).returning();
        savedSpecialties.push(insertedSpecialty);
      }
    }

    for (const existingSpecialty of existingSpecialties) {
      if (!keptIds.has(existingSpecialty.id)) {
        await tx.delete(specialties).where(eq(specialties.id, existingSpecialty.id));
      }
    }

    return universityResult(university, savedSpecialties);
  });

  if (!updated) {
    return NextResponse.json({ error: "ВУЗ не найден." }, { status: 404 });
  }

  return NextResponse.json({ university: updated });
}

export async function DELETE(request: NextRequest) {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
  } catch {
    return databaseUnavailableResponse();
  }

  let user: Awaited<ReturnType<typeof getCurrentUser>>;

  try {
    user = await getCurrentUser();
  } catch (error) {
    return databaseErrorResponse(error, "Не удалось проверить сессию.");
  }

  if (!user) {
    return unauthorizedResponse();
  }

  const id = Number(request.nextUrl.searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Некорректный идентификатор ВУЗа." }, { status: 400 });
  }

  const deleted = await database.delete(universities).where(and(eq(universities.id, id), eq(universities.userId, user.id))).returning({ id: universities.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "ВУЗ не найден." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

import { requireDb } from "@/db";
import { specialties, universities } from "@/db/schema";
import type { OlympiadBenefit, SpecialtyInput, University, UniversityInput } from "@/lib/university-calculator";
import { asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const olympiadBenefits = new Set<OlympiadBenefit>(["bvi", "hundred", "none"]);

function toIntegerInRange(value: unknown, min: number, max: number, fallback = min) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function validateSpecialty(input: Partial<SpecialtyInput>): SpecialtyInput | null {
  const name = textValue(input.name);

  if (!name) {
    return null;
  }

  return {
    name,
    passingScore: toIntegerInRange(input.passingScore, 0, 500),
    tuitionCost: toIntegerInRange(input.tuitionCost, 0, 5_000_000),
    budgetSeats: toIntegerInRange(input.budgetSeats, 0, 10_000),
    paidSeats: toIntegerInRange(input.paidSeats, 0, 10_000),
    interestScore: toIntegerInRange(input.interestScore, 1, 5, 3),
    careerScore: toIntegerInRange(input.careerScore, 1, 5, 3),
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

  const olympiadBenefit = source.olympiadBenefit;

  if (!olympiadBenefit || !olympiadBenefits.has(olympiadBenefit)) {
    return { error: "Выберите корректный тип олимпиадной льготы." };
  }

  const cleanSpecialties = (Array.isArray(source.specialties) ? source.specialties : [])
    .map((specialty) => validateSpecialty(specialty))
    .filter((specialty): specialty is SpecialtyInput => specialty !== null);

  if (cleanSpecialties.length === 0) {
    return { error: "Добавьте хотя бы одну специальность." };
  }

  if (cleanSpecialties.length > 8) {
    return { error: "Можно добавить не больше восьми направлений за один раз." };
  }

  return {
    name,
    city: textValue(source.city),
    hasMilitaryDepartment: Boolean(source.hasMilitaryDepartment),
    hasDormitory: Boolean(source.hasDormitory),
    commuteMinutes: toIntegerInRange(source.commuteMinutes, 0, 360),
    olympiadBenefit,
    extraPoints: toIntegerInRange(source.extraPoints, 0, 25),
    specialties: cleanSpecialties,
  };
}

function databaseUnavailableResponse() {
  return NextResponse.json(
    {
      error: "Не настроен DATABASE_URL. Добавьте переменную окружения или используйте локальный черновик в интерфейсе.",
      universities: [],
    },
    { status: 503 },
  );
}

export async function GET() {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
  } catch {
    return databaseUnavailableResponse();
  }

  const rows = await database
    .select({
      universityId: universities.id,
      universityName: universities.name,
      city: universities.city,
      hasMilitaryDepartment: universities.hasMilitaryDepartment,
      hasDormitory: universities.hasDormitory,
      commuteMinutes: universities.commuteMinutes,
      olympiadBenefit: universities.olympiadBenefit,
      extraPoints: universities.extraPoints,
      createdAt: universities.createdAt,
      specialtyId: specialties.id,
      specialtyUniversityId: specialties.universityId,
      specialtyName: specialties.name,
      passingScore: specialties.passingScore,
      tuitionCost: specialties.tuitionCost,
      budgetSeats: specialties.budgetSeats,
      paidSeats: specialties.paidSeats,
      interestScore: specialties.interestScore,
      careerScore: specialties.careerScore,
    })
    .from(universities)
    .leftJoin(specialties, eq(specialties.universityId, universities.id))
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
      olympiadBenefit: row.olympiadBenefit as OlympiadBenefit,
      extraPoints: row.extraPoints,
      createdAt: row.createdAt.toISOString(),
      specialties: [],
    };

    if (row.specialtyId && row.specialtyUniversityId && row.specialtyName) {
      university.specialties.push({
        id: row.specialtyId,
        universityId: row.specialtyUniversityId,
        name: row.specialtyName,
        passingScore: row.passingScore ?? 0,
        tuitionCost: row.tuitionCost ?? 0,
        budgetSeats: row.budgetSeats ?? 0,
        paidSeats: row.paidSeats ?? 0,
        interestScore: row.interestScore ?? 3,
        careerScore: row.careerScore ?? 3,
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

  const payload = validatePayload(await request.json());

  if ("error" in payload) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const created = await database.transaction(async (tx) => {
    const [university] = await tx
      .insert(universities)
      .values({
        name: payload.name,
        city: payload.city,
        hasMilitaryDepartment: payload.hasMilitaryDepartment,
        hasDormitory: payload.hasDormitory,
        commuteMinutes: payload.commuteMinutes,
        olympiadBenefit: payload.olympiadBenefit,
        extraPoints: payload.extraPoints,
      })
      .returning();

    const insertedSpecialties = await tx
      .insert(specialties)
      .values(
        payload.specialties.map((specialty) => ({
          universityId: university.id,
          name: specialty.name,
          passingScore: specialty.passingScore,
          tuitionCost: specialty.tuitionCost,
          budgetSeats: specialty.budgetSeats,
          paidSeats: specialty.paidSeats,
          interestScore: specialty.interestScore,
          careerScore: specialty.careerScore,
        })),
      )
      .returning();

    return {
      id: university.id,
      name: university.name,
      city: university.city,
      hasMilitaryDepartment: university.hasMilitaryDepartment,
      hasDormitory: university.hasDormitory,
      commuteMinutes: university.commuteMinutes,
      olympiadBenefit: university.olympiadBenefit as OlympiadBenefit,
      extraPoints: university.extraPoints,
      createdAt: university.createdAt.toISOString(),
      specialties: insertedSpecialties,
    } satisfies University;
  });

  return NextResponse.json({ university: created }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
  } catch {
    return databaseUnavailableResponse();
  }

  const id = Number(request.nextUrl.searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Некорректный идентификатор ВУЗа." }, { status: 400 });
  }

  await database.delete(universities).where(eq(universities.id, id));

  return NextResponse.json({ ok: true });
}

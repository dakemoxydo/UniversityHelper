import { NextResponse } from "next/server";

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
}

export function isUniqueViolation(error: unknown) {
  return errorCode(error) === "23505";
}

export function databaseErrorResponse(error: unknown, fallback = "Не удалось выполнить запрос к базе данных.") {
  const code = errorCode(error);

  if (code === "42P01" || code === "42703" || code === "23503") {
    return NextResponse.json({ error: "База данных не готова. Примените миграции Drizzle к PostgreSQL." }, { status: 503 });
  }

  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "ECONNREFUSED") {
    return NextResponse.json({ error: "Не удалось подключиться к PostgreSQL. Проверьте DATABASE_URL в Vercel." }, { status: 503 });
  }

  return NextResponse.json({ error: fallback }, { status: 500 });
}
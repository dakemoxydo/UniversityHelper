import { NextResponse } from "next/server";

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function logApiError(scope: string, error: unknown) {
  const code = errorCode(error);
  console.error(`[${scope}]`, code ? `code=${code}` : "", errorMessage(error));
}

export function isUniqueViolation(error: unknown) {
  return errorCode(error) === "23505";
}

export function databaseErrorResponse(error: unknown, fallback = "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0437\u0430\u043f\u0440\u043e\u0441 \u043a \u0431\u0430\u0437\u0435 \u0434\u0430\u043d\u043d\u044b\u0445.", scope = "database") {
  const code = errorCode(error);
  logApiError(scope, error);

  if (code === "42P01" || code === "42703" || code === "23503") {
    return NextResponse.json({ error: "\u0411\u0430\u0437\u0430 \u0434\u0430\u043d\u043d\u044b\u0445 \u043d\u0435 \u0433\u043e\u0442\u043e\u0432\u0430. \u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u0435 \u043c\u0438\u0433\u0440\u0430\u0446\u0438\u0438 Drizzle \u043a PostgreSQL." }, { status: 503 });
  }

  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "ECONNREFUSED") {
    return NextResponse.json({ error: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c\u0441\u044f \u043a PostgreSQL. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 DATABASE_URL \u0432 Vercel." }, { status: 503 });
  }

  return NextResponse.json({ error: fallback }, { status: 500 });
}
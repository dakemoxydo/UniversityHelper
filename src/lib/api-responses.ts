import { NextResponse } from "next/server";

type ErrorLike = {
  cause?: unknown;
  code?: unknown;
  detail?: unknown;
  message?: unknown;
};

function errorLike(error: unknown): ErrorLike | null {
  return typeof error === "object" && error !== null ? (error as ErrorLike) : null;
}

function nestedCause(error: unknown) {
  return errorLike(error)?.cause;
}

function errorCode(error: unknown): string {
  const directCode = errorLike(error)?.code;

  if (directCode) {
    return String(directCode);
  }

  const cause = nestedCause(error);
  return cause ? errorCode(cause) : "";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  const message = errorLike(error)?.message;
  return message ? String(message) : String(error);
}

function errorDetail(error: unknown): string {
  const detail = errorLike(error)?.detail;

  if (detail) {
    return String(detail);
  }

  const cause = nestedCause(error);
  return cause ? errorDetail(cause) : "";
}

export function logApiError(scope: string, error: unknown) {
  const cause = nestedCause(error);
  const payload = {
    code: errorCode(error),
    message: errorMessage(error),
    detail: errorDetail(error),
    cause: cause ? errorMessage(cause) : "",
  };

  console.error(`[${scope}]`, payload);
}

export function isUniqueViolation(error: unknown) {
  return errorCode(error) === "23505";
}

export function databaseErrorResponse(error: unknown, fallback = "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0437\u0430\u043f\u0440\u043e\u0441 \u043a \u0431\u0430\u0437\u0435 \u0434\u0430\u043d\u043d\u044b\u0445.", scope = "database") {
  const code = errorCode(error);
  logApiError(scope, error);

  if (code === "42P01" || code === "42703" || code === "23503") {
    return NextResponse.json({ error: "\u0411\u0430\u0437\u0430 \u0434\u0430\u043d\u043d\u044b\u0445 \u043d\u0435 \u0433\u043e\u0442\u043e\u0432\u0430. \u041e\u0431\u043d\u043e\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443 \u0438 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435." }, { status: 503 });
  }

  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "ECONNREFUSED") {
    return NextResponse.json({ error: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c\u0441\u044f \u043a PostgreSQL. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 DATABASE_URL \u0432 Vercel." }, { status: 503 });
  }

  return NextResponse.json({ error: fallback }, { status: 500 });
}
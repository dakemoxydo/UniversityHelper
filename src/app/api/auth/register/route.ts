import { requireDb } from "@/db";
import { ensureDatabaseSchema } from "@/db/ensure-schema";
import { profiles, users } from "@/db/schema";
import { databaseErrorResponse, isUniqueViolation, logApiError } from "@/lib/api-responses";
import { createSession, hashPassword, normalizeLogin, validatePassword } from "@/lib/auth";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
    await ensureDatabaseSchema();
  } catch (error) {
    logApiError("auth.register.init", error);
    return NextResponse.json({ error: "DATABASE_URL \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d \u0438\u043b\u0438 \u0431\u0430\u0437\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { login?: unknown; password?: unknown } | null;
  const login = normalizeLogin(body?.login);
  const password = validatePassword(body?.password);
  const limit = rateLimit(rateLimitKey(request, "auth.register", login), 5, 60_000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "\u0421\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u043f\u043e\u043f\u044b\u0442\u043e\u043a \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c. \u041f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435 \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (login.length < 3) {
    return NextResponse.json({ error: "\u041b\u043e\u0433\u0438\u043d \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043d\u0435 \u043a\u043e\u0440\u043e\u0447\u0435 3 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432." }, { status: 400 });
  }

  if (!/^[a-z0-9._-]+$/.test(login)) {
    return NextResponse.json({ error: "\u041b\u043e\u0433\u0438\u043d \u043c\u043e\u0436\u0435\u0442 \u0441\u043e\u0434\u0435\u0440\u0436\u0430\u0442\u044c \u043b\u0430\u0442\u0438\u043d\u0441\u043a\u0438\u0435 \u0431\u0443\u043a\u0432\u044b, \u0446\u0438\u0444\u0440\u044b, \u0442\u043e\u0447\u043a\u0443, \u0434\u0435\u0444\u0438\u0441 \u0438 \u043f\u043e\u0434\u0447\u0451\u0440\u043a\u0438\u0432\u0430\u043d\u0438\u0435." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "\u041f\u0430\u0440\u043e\u043b\u044c \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043d\u0435 \u043a\u043e\u0440\u043e\u0447\u0435 8 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432." }, { status: 400 });
  }

  let createdUserId: number | null = null;

  try {
    const [existingUser] = await database.select({ id: users.id }).from(users).where(eq(users.login, login)).limit(1);

    if (existingUser) {
      return NextResponse.json({ error: "\u0422\u0430\u043a\u043e\u0439 \u043b\u043e\u0433\u0438\u043d \u0443\u0436\u0435 \u0437\u0430\u043d\u044f\u0442." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await database.insert(users).values({ login, passwordHash }).returning({ id: users.id, login: users.login });
    createdUserId = user.id;

    await database.insert(profiles).values({ userId: user.id }).onConflictDoNothing();
    await createSession(user.id);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (createdUserId) {
      await database.delete(users).where(eq(users.id, createdUserId)).catch((cleanupError) => logApiError("auth.register.cleanup", cleanupError));
    }

    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "\u0422\u0430\u043a\u043e\u0439 \u043b\u043e\u0433\u0438\u043d \u0443\u0436\u0435 \u0437\u0430\u043d\u044f\u0442." }, { status: 409 });
    }

    return databaseErrorResponse(error, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c.", "auth.register");
  }
}
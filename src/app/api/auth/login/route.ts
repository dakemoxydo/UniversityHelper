import { requireDb } from "@/db";
import { ensureDatabaseSchema } from "@/db/ensure-schema";
import { users } from "@/db/schema";
import { databaseErrorResponse, logApiError } from "@/lib/api-responses";
import { createSession, normalizeLogin, validatePassword, verifyPassword } from "@/lib/auth";
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
    logApiError("auth.login.init", error);
    return NextResponse.json({ error: "DATABASE_URL \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d \u0438\u043b\u0438 \u0431\u0430\u0437\u0430 \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { login?: unknown; password?: unknown } | null;
  const login = normalizeLogin(body?.login);
  const password = validatePassword(body?.password);
  const limit = rateLimit(rateLimitKey(request, "auth.login", login), 10, 60_000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "\u0421\u043b\u0438\u0448\u043a\u043e\u043c \u043c\u043d\u043e\u0433\u043e \u043f\u043e\u043f\u044b\u0442\u043e\u043a \u0432\u0445\u043e\u0434\u0430. \u041f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435 \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const [user] = await database
      .select({ id: users.id, login: users.login, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.login, login))
      .limit(1);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u043b\u043e\u0433\u0438\u043d \u0438\u043b\u0438 \u043f\u0430\u0440\u043e\u043b\u044c." }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({ user: { id: user.id, login: user.login } });
  } catch (error) {
    return databaseErrorResponse(error, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u043e\u0439\u0442\u0438.", "auth.login");
  }
}
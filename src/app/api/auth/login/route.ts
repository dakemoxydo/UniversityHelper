import { requireDb } from "@/db";
import { users } from "@/db/schema";
import { databaseErrorResponse } from "@/lib/api-responses";
import { createSession, normalizeLogin, validatePassword, verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
  } catch {
    return NextResponse.json({ error: "DATABASE_URL не настроен, вход недоступен." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { login?: unknown; password?: unknown } | null;
  const login = normalizeLogin(body?.login);
  const password = validatePassword(body?.password);

  try {
    const [user] = await database
      .select({ id: users.id, login: users.login, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.login, login))
      .limit(1);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Неверный логин или пароль." }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({ user: { id: user.id, login: user.login } });
  } catch (error) {
    return databaseErrorResponse(error, "Не удалось войти.");
  }
}
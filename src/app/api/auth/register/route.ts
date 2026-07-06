import { requireDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { createSession, hashPassword, normalizeLogin, validatePassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let database: ReturnType<typeof requireDb>;

  try {
    database = requireDb();
  } catch {
    return NextResponse.json({ error: "DATABASE_URL не настроен, регистрация недоступна." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { login?: unknown; password?: unknown } | null;
  const login = normalizeLogin(body?.login);
  const password = validatePassword(body?.password);

  if (login.length < 3) {
    return NextResponse.json({ error: "Логин должен быть не короче 3 символов." }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json({ error: "Пароль должен быть не короче 4 символов." }, { status: 400 });
  }

  const [existingUser] = await database.select({ id: users.id }).from(users).where(eq(users.login, login)).limit(1);

  if (existingUser) {
    return NextResponse.json({ error: "Такой логин уже занят." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const [user] = await database.insert(users).values({ login, passwordHash }).returning({ id: users.id, login: users.login });
  await database.insert(profiles).values({ userId: user.id });
  await createSession(user.id);

  return NextResponse.json({ user }, { status: 201 });
}

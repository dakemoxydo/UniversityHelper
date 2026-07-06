import { requireDb } from "@/db";
import { destroyCurrentSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    requireDb();
    await destroyCurrentSession();
  } catch {
    return NextResponse.json({ error: "Не удалось завершить сессию." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

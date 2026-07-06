import { requireDb } from "@/db";
import { databaseErrorResponse } from "@/lib/api-responses";
import { destroyCurrentSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    requireDb();
    await destroyCurrentSession();
  } catch (error) {
    return databaseErrorResponse(error, "Не удалось завершить сессию.");
  }

  return NextResponse.json({ ok: true });
}
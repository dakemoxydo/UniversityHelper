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
    return databaseErrorResponse(error, "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044c \u0441\u0435\u0441\u0441\u0438\u044e.", "auth.logout");
  }

  return NextResponse.json({ ok: true });
}
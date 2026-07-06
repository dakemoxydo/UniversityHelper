import { requireDb } from "@/db";
import { databaseErrorResponse } from "@/lib/api-responses";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    requireDb();
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    return databaseErrorResponse(error, "Не удалось проверить сессию.");
  }
}
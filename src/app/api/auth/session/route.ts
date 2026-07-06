import { requireDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    requireDb();
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null, error: "DATABASE_URL не настроен." }, { status: 503 });
  }
}

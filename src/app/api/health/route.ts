import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", timestamp: new Date().toISOString(), service: "nexrun" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", timestamp: new Date().toISOString(), service: "nexrun" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

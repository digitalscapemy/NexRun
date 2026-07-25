import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { serverEnv } from "@/server/env";
import { extractBearerToken, secretsMatch } from "@/server/security/request";
import { dispatchRaceDayReminders } from "@/server/services/race-reminder-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Scheduled reminders are not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!secretsMatch(secret, extractBearerToken(request.headers.get("authorization")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await dispatchRaceDayReminders(db);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Race-day reminder job failed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { serverEnv } from "@/server/env";
import { extractBearerToken, secretsMatch } from "@/server/security/request";
import { pruneExpiredRateLimits } from "@/server/services/rate-limit-service";
import { releaseExpiredReservations } from "@/server/services/reservation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret) return false;
  return secretsMatch(secret, extractBearerToken(request.headers.get("authorization")));
}

async function handle(request: NextRequest) {
  if (!serverEnv.CRON_SECRET) {
    return NextResponse.json(
      { error: "Scheduled maintenance is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const [reservations, rateLimits] = await Promise.all([
    releaseExpiredReservations(db),
    pruneExpiredRateLimits(db),
  ]);
  return NextResponse.json(
    { ok: true, reservations, rateLimits },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export { handle as POST };

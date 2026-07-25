import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@/generated/prisma";

const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;

export async function enforceRateLimit(
  db: PrismaClient,
  input: { key: string; max: number; windowMs: number }
) {
  const now = Date.now();
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`rate:${input.key}`})) IS NULL AS locked`;
    const current = await tx.rateLimit.findUnique({ where: { key: input.key } });
    const windowStart = current ? Number(current.lastRequest) : now;
    const windowExpired = now - windowStart >= input.windowMs;
    const count = windowExpired ? 1 : (current?.count ?? 0) + 1;
    if (!windowExpired && count > input.max) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please wait a moment and try again.",
      });
    }
    await tx.rateLimit.upsert({
      where: { key: input.key },
      update: { count, lastRequest: BigInt(windowExpired ? now : windowStart) },
      create: { key: input.key, count, lastRequest: BigInt(now) },
    });
  });
}

export async function pruneExpiredRateLimits(
  db: PrismaClient,
  retentionMs = DEFAULT_RETENTION_MS,
) {
  const cutoff = BigInt(Date.now() - Math.max(60_000, retentionMs));
  const result = await db.rateLimit.deleteMany({
    where: { lastRequest: { lt: cutoff } },
  });
  return { deleted: result.count };
}

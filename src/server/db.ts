import "server-only";

import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { serverEnv } from "@/server/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: serverEnv.DATABASE_URL,
    max: serverEnv.DATABASE_POOL_MAX,
    idleTimeoutMillis: serverEnv.DATABASE_POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: serverEnv.DATABASE_CONNECTION_TIMEOUT_MS,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (serverEnv.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

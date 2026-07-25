import type { Prisma, PrismaClient } from "@/generated/prisma";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  href?: string | null;
}

export async function createNotification(db: DatabaseClient, input: NotificationInput) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
    },
  });
}

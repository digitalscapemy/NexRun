import type { Prisma, PrismaClient } from "@/generated/prisma";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export interface AuditInput {
  actorUserId?: string | null;
  organizationId?: string | null;
  eventId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}

export async function writeAuditLog(db: DatabaseClient, input: AuditInput) {
  return db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      organizationId: input.organizationId ?? null,
      eventId: input.eventId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      metadata: input.metadata,
    },
  });
}

import { prisma } from './prisma';

interface AuditLogParams {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}

export async function logAuditAction({
  tenantId,
  userId,
  action,
  entityType,
  entityId,
  details = {},
}: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        details: JSON.stringify(details),
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // We don't throw here to avoid failing the main request if logging fails
  }
}

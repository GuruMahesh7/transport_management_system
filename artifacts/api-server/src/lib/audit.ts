import { db, auditLogsTable } from "@workspace/db";

interface AuditParams {
  action: string;
  entityType: string;
  entityId: string | number;
  oldValue?: any;
  newValue?: any;
  performedBy: number;
  hubId?: number | null;
  description?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      action: params.action,
      entityType: params.entityType,
      entityId: String(params.entityId),
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      performedBy: params.performedBy,
      hubId: params.hubId ?? null,
      description: params.description ?? null,
    });
  } catch {
    // non-fatal
  }
}

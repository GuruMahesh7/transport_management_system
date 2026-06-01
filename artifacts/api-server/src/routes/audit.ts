import { Router } from "express";
import { db, auditLogsTable, staffTable, hubsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/audit-logs", requireAuth, requireRole("SUPER_ADMIN"), async (req, res) => {
  const { staffId, hubId, action, dateFrom, dateTo, page = "1", limit: limitStr = "50" } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limitStr as string);
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (staffId) conditions.push(eq(auditLogsTable.performedBy, parseInt(staffId as string)));
  if (hubId) conditions.push(eq(auditLogsTable.hubId, parseInt(hubId as string)));
  if (action) conditions.push(eq(auditLogsTable.action, action as string));
  if (dateFrom) conditions.push(gte(auditLogsTable.timestamp, new Date(dateFrom as string)));
  if (dateTo) { const d = new Date(dateTo as string); d.setHours(23, 59, 59, 999); conditions.push(lte(auditLogsTable.timestamp, d)); }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogsTable).where(where);
  const rows = await db.select().from(auditLogsTable).where(where).orderBy(desc(auditLogsTable.timestamp)).limit(limitNum).offset(offset);

  const enriched = await Promise.all(rows.map(async log => {
    let performedByName = null, hubName = null;
    if (log.performedBy) { const [s] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, log.performedBy)).limit(1); performedByName = s?.name ?? null; }
    if (log.hubId) { const [h] = await db.select({ hubName: hubsTable.hubName }).from(hubsTable).where(eq(hubsTable.id, log.hubId)).limit(1); hubName = h?.hubName ?? null; }
    return { ...log, performedByName, hubName, timestamp: log.timestamp.toISOString() };
  }));

  res.json({ logs: enriched, total: Number(count), page: pageNum, limit: limitNum });
});

export default router;

import { Router } from "express";
import { db, parcelsTable, hubsTable, complaintsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, or, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
}

router.get("/dashboard/stats", requireAuth, async (req, res) => {
  const { hubId } = req.query;
  const staff = (req as any).staff;
  const { start, end } = todayRange();

  const scopedHubId = hubId ? parseInt(hubId as string) : (staff.role !== "SUPER_ADMIN" ? staff.hubId : null);

  const hubFilter = (col: any, hubId: number | null) => hubId
    ? or(eq(parcelsTable.sourceHubId, hubId), eq(parcelsTable.destinationHubId, hubId))!
    : sql`1=1`;

  const dateFilter = and(gte(parcelsTable.createdAt, start), lte(parcelsTable.createdAt, end));

  const [todayBooked] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(and(dateFilter, scopedHubId ? or(eq(parcelsTable.sourceHubId, scopedHubId), eq(parcelsTable.destinationHubId, scopedHubId))! : sql`1=1`));

  const [incoming] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(and(
      scopedHubId ? eq(parcelsTable.destinationHubId, scopedHubId) : sql`1=1`,
      or(eq(parcelsTable.currentStatus, "DISPATCHED"), eq(parcelsTable.currentStatus, "RECEIVED_AT_DESTINATION"))!
    ));

  const [outgoing] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(and(
      scopedHubId ? eq(parcelsTable.sourceHubId, scopedHubId) : sql`1=1`,
      eq(parcelsTable.currentStatus, "DISPATCHED"),
      dateFilter
    ));

  const [ready] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(and(
      eq(parcelsTable.currentStatus, "READY_FOR_PICKUP"),
      scopedHubId ? eq(parcelsTable.destinationHubId, scopedHubId) : sql`1=1`
    ));

  const [delivered] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
    .where(and(
      eq(parcelsTable.currentStatus, "DELIVERED"),
      scopedHubId ? or(eq(parcelsTable.sourceHubId, scopedHubId), eq(parcelsTable.destinationHubId, scopedHubId))! : sql`1=1`,
      dateFilter
    ));

  let openComplaintsQuery = db.select({ count: sql<number>`count(*)` })
    .from(complaintsTable)
    .innerJoin(parcelsTable, eq(complaintsTable.parcelId, parcelsTable.id));

  let openComplaintsWhere = or(eq(complaintsTable.status, "RAISED"), eq(complaintsTable.status, "INVESTIGATING"))!;
  if (scopedHubId) {
    openComplaintsWhere = and(
      openComplaintsWhere,
      or(eq(parcelsTable.sourceHubId, scopedHubId), eq(parcelsTable.destinationHubId, scopedHubId))!
    )!;
  }
  const [openComplaints] = await openComplaintsQuery.where(openComplaintsWhere);

  res.json({
    todayBookings: Number(todayBooked.count),
    incomingParcels: Number(incoming.count),
    outgoingParcels: Number(outgoing.count),
    readyForPickup: Number(ready.count),
    deliveredToday: Number(delivered.count),
    openComplaints: Number(openComplaints.count),
  });
});

router.get("/dashboard/recent-parcels", requireAuth, async (req, res) => {
  const { hubId, limit: limitStr = "10" } = req.query;
  const staff = (req as any).staff;
  const limitNum = parseInt(limitStr as string);
  const scopedHubId = hubId ? parseInt(hubId as string) : (staff.role !== "SUPER_ADMIN" ? staff.hubId : null);

  const where = scopedHubId
    ? or(eq(parcelsTable.sourceHubId, scopedHubId), eq(parcelsTable.destinationHubId, scopedHubId))!
    : sql`1=1`;

  const rows = await db.select().from(parcelsTable).where(where).orderBy(desc(parcelsTable.createdAt)).limit(limitNum);

  const enriched = await Promise.all(rows.map(async p => {
    const [src] = await db.select({ hubName: hubsTable.hubName, hubCode: hubsTable.hubCode }).from(hubsTable).where(eq(hubsTable.id, p.sourceHubId)).limit(1);
    const [dst] = await db.select({ hubName: hubsTable.hubName, hubCode: hubsTable.hubCode }).from(hubsTable).where(eq(hubsTable.id, p.destinationHubId)).limit(1);
    return { ...p, weightKg: parseFloat(p.weightKg), charges: parseFloat(p.charges), sourceHubName: src?.hubName ?? null, sourceHubCode: src?.hubCode ?? null, destinationHubName: dst?.hubName ?? null, destinationHubCode: dst?.hubCode ?? null, bookedByName: null, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
  }));
  res.json(enriched);
});

router.get("/dashboard/hub-breakdown", requireAuth, async (req, res) => {
  const hubs = await db.select().from(hubsTable).orderBy(hubsTable.hubName);
  const { start, end } = todayRange();

  const breakdown = await Promise.all(hubs.map(async hub => {
    const [todayBooked] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
      .where(and(eq(parcelsTable.sourceHubId, hub.id), gte(parcelsTable.createdAt, start), lte(parcelsTable.createdAt, end)));
    const [inTransit] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
      .where(and(or(eq(parcelsTable.sourceHubId, hub.id), eq(parcelsTable.destinationHubId, hub.id))!, eq(parcelsTable.currentStatus, "DISPATCHED")));
    const [delivered] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
      .where(and(or(eq(parcelsTable.sourceHubId, hub.id), eq(parcelsTable.destinationHubId, hub.id))!, eq(parcelsTable.currentStatus, "DELIVERED")));
    const [pending] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable)
      .where(and(or(eq(parcelsTable.sourceHubId, hub.id), eq(parcelsTable.destinationHubId, hub.id))!, or(eq(parcelsTable.currentStatus, "BOOKED"), eq(parcelsTable.currentStatus, "RECEIVED_AT_ORIGIN"), eq(parcelsTable.currentStatus, "READY_FOR_PICKUP"))!));
    const [complaints] = await db.select({ count: sql<number>`count(*)` })
      .from(complaintsTable)
      .innerJoin(parcelsTable, eq(complaintsTable.parcelId, parcelsTable.id))
      .where(and(
        or(eq(complaintsTable.status, "RAISED"), eq(complaintsTable.status, "INVESTIGATING"))!,
        or(eq(parcelsTable.sourceHubId, hub.id), eq(parcelsTable.destinationHubId, hub.id))!
      ));
    return { hubId: hub.id, hubName: hub.hubName, hubCode: hub.hubCode, todayBookings: Number(todayBooked.count), inTransit: Number(inTransit.count), delivered: Number(delivered.count), pending: Number(pending.count), complaints: Number(complaints.count) };
  }));
  res.json(breakdown);
});

export default router;

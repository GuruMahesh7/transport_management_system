import { Router } from "express";
import { db, parcelsTable, hubsTable, staffTable, parcelStatusHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { createAuditLog } from "../lib/audit";

const router = Router();

const STATUS_FLOW: Record<string, string> = {
  BOOKED: "RECEIVED_AT_ORIGIN",
  RECEIVED_AT_ORIGIN: "DISPATCHED",
  DISPATCHED: "RECEIVED_AT_DESTINATION",
  RECEIVED_AT_DESTINATION: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "DELIVERED",
};

const ACTION_LABELS: Record<string, string> = {
  RECEIVED_AT_ORIGIN: "Received at Origin Hub",
  DISPATCHED: "Dispatched",
  RECEIVED_AT_DESTINATION: "Received at Destination Hub",
  READY_FOR_PICKUP: "Marked Ready for Pickup",
  DELIVERED: "Delivered",
};

router.post("/scan", requireAuth, async (req, res) => {
  const { awbNumber, action, hubId, notes } = req.body;
  const staff = (req as any).staff;

  const [parcel] = await db.select().from(parcelsTable).where(eq(parcelsTable.awbNumber, awbNumber)).limit(1);
  if (!parcel) { res.status(404).json({ error: `Parcel ${awbNumber} not found` }); return; }

  const previousStatus = parcel.currentStatus;
  let newStatus: string;

  if (action && action !== "AUTO") {
    newStatus = action;
  } else {
    const next = STATUS_FLOW[previousStatus];
    if (!next) {
      res.status(400).json({ error: `Parcel is already in final status: ${previousStatus}` });
      return;
    }
    newStatus = next;
  }

  const hubIdToUse = hubId || staff.hubId || null;
  await db.update(parcelsTable).set({ currentStatus: newStatus }).where(eq(parcelsTable.id, parcel.id));
  await db.insert(parcelStatusHistoryTable).values({ parcelId: parcel.id, status: newStatus, hubId: hubIdToUse, updatedBy: staff.id, notes: notes || null });
  await createAuditLog({ action: "SCAN", entityType: "parcel", entityId: parcel.id, oldValue: { status: previousStatus }, newValue: { status: newStatus }, performedBy: staff.id, hubId: hubIdToUse, description: `Scanned parcel ${awbNumber}: ${previousStatus} → ${newStatus}` });

  const [updated] = await db.select().from(parcelsTable).where(eq(parcelsTable.id, parcel.id)).limit(1);
  const history = await db.select().from(parcelStatusHistoryTable).where(eq(parcelStatusHistoryTable.parcelId, parcel.id)).orderBy(parcelStatusHistoryTable.timestamp);

  const [src] = await db.select({ hubName: hubsTable.hubName, hubCode: hubsTable.hubCode }).from(hubsTable).where(eq(hubsTable.id, updated.sourceHubId)).limit(1);
  const [dst] = await db.select({ hubName: hubsTable.hubName, hubCode: hubsTable.hubCode }).from(hubsTable).where(eq(hubsTable.id, updated.destinationHubId)).limit(1);

  const enrichedHistory = await Promise.all(history.map(async h => {
    let hubName = null, updatedByName = null;
    if (h.hubId) { const [hub] = await db.select({ hubName: hubsTable.hubName }).from(hubsTable).where(eq(hubsTable.id, h.hubId)).limit(1); hubName = hub?.hubName ?? null; }
    if (h.updatedBy) { const [s] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, h.updatedBy)).limit(1); updatedByName = s?.name ?? null; }
    return { ...h, hubName, updatedByName, timestamp: h.timestamp.toISOString() };
  }));

  const enrichedParcel = {
    ...updated,
    weightKg: parseFloat(updated.weightKg),
    charges: parseFloat(updated.charges),
    sourceHubName: src?.hubName ?? null,
    sourceHubCode: src?.hubCode ?? null,
    destinationHubName: dst?.hubName ?? null,
    destinationHubCode: dst?.hubCode ?? null,
    bookedByName: null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    history: enrichedHistory,
  };

  res.json({ parcel: enrichedParcel, previousStatus, newStatus, actionTaken: ACTION_LABELS[newStatus] || newStatus });
});

export default router;

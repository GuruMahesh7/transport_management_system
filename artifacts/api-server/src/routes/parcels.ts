import { Router } from "express";
import { db, parcelsTable, hubsTable, staffTable, parcelStatusHistoryTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql, or, ilike } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { generateAwbNumber } from "../lib/awb";
import { createAuditLog } from "../lib/audit";
import { sendParcelEmailNotification } from "../lib/email";

const router = Router();

function parcelBase() {
  return db
    .select({
      id: parcelsTable.id,
      awbNumber: parcelsTable.awbNumber,
      senderName: parcelsTable.senderName,
      senderPhone: parcelsTable.senderPhone,
      senderAddress: parcelsTable.senderAddress,
      receiverName: parcelsTable.receiverName,
      receiverPhone: parcelsTable.receiverPhone,
      receiverAddress: parcelsTable.receiverAddress,
      numBoxes: parcelsTable.numBoxes,
      weightKg: parcelsTable.weightKg,
      parcelType: parcelsTable.parcelType,
      charges: parcelsTable.charges,
      remarks: parcelsTable.remarks,
      sourceHubId: parcelsTable.sourceHubId,
      destinationHubId: parcelsTable.destinationHubId,
      currentStatus: parcelsTable.currentStatus,
      bookedBy: parcelsTable.bookedBy,
      createdAt: parcelsTable.createdAt,
      updatedAt: parcelsTable.updatedAt,
    })
    .from(parcelsTable);
}

async function enrichParcel(p: any) {
  const [src] = await db.select({ hubName: hubsTable.hubName, hubCode: hubsTable.hubCode }).from(hubsTable).where(eq(hubsTable.id, p.sourceHubId)).limit(1);
  const [dst] = await db.select({ hubName: hubsTable.hubName, hubCode: hubsTable.hubCode }).from(hubsTable).where(eq(hubsTable.id, p.destinationHubId)).limit(1);
  let bookedByName = null;
  if (p.bookedBy) {
    const [bk] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, p.bookedBy)).limit(1);
    bookedByName = bk?.name ?? null;
  }
  return {
    ...p,
    weightKg: parseFloat(p.weightKg),
    charges: parseFloat(p.charges),
    sourceHubName: src?.hubName ?? null,
    sourceHubCode: src?.hubCode ?? null,
    destinationHubName: dst?.hubName ?? null,
    destinationHubCode: dst?.hubCode ?? null,
    bookedByName,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/parcels", requireAuth, async (req, res) => {
  const { hubId, status, page = "1", limit: limitStr = "20", dateFrom, dateTo } = req.query;
  const staff = (req as any).staff;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limitStr as string);
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (status) conditions.push(eq(parcelsTable.currentStatus, status as string));
  if (hubId) {
    const hid = parseInt(hubId as string);
    conditions.push(or(eq(parcelsTable.sourceHubId, hid), eq(parcelsTable.destinationHubId, hid))!);
  } else if (staff.role !== "SUPER_ADMIN" && staff.hubId) {
    conditions.push(or(eq(parcelsTable.sourceHubId, staff.hubId), eq(parcelsTable.destinationHubId, staff.hubId))!);
  }
  if (dateFrom) conditions.push(gte(parcelsTable.createdAt, new Date(dateFrom as string)));
  if (dateTo) {
    const d = new Date(dateTo as string);
    d.setHours(23, 59, 59, 999);
    conditions.push(lte(parcelsTable.createdAt, d));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(parcelsTable).where(where);
  const rows = await db.select().from(parcelsTable).where(where).orderBy(desc(parcelsTable.createdAt)).limit(limitNum).offset(offset);
  const parcels = await Promise.all(rows.map(enrichParcel));
  res.json({ parcels, total: Number(count), page: pageNum, limit: limitNum });
});

router.post("/parcels", requireAuth, async (req, res) => {
  const staff = (req as any).staff;
  const { senderName, senderPhone, senderEmail, senderAddress, receiverName, receiverPhone, receiverEmail, receiverAddress, numBoxes, weightKg, parcelType, charges, remarks, sourceHubId, destinationHubId } = req.body;
  const awbNumber = await generateAwbNumber();
  const [parcel] = await db.insert(parcelsTable).values({
    awbNumber, senderName, senderPhone, senderEmail: senderEmail || null, senderAddress, receiverName, receiverPhone, receiverEmail: receiverEmail || null, receiverAddress,
    numBoxes, weightKg: String(weightKg), parcelType, charges: String(charges), remarks: remarks || null,
    sourceHubId, destinationHubId, currentStatus: "BOOKED", bookedBy: staff.id,
  }).returning();

  await db.insert(parcelStatusHistoryTable).values({
    parcelId: parcel.id, status: "BOOKED", hubId: sourceHubId, updatedBy: staff.id, notes: "Parcel booked",
  });
  await createAuditLog({ action: "CREATE", entityType: "parcel", entityId: parcel.id, newValue: { awbNumber, currentStatus: "BOOKED" }, performedBy: staff.id, hubId: sourceHubId, description: `Booked parcel ${awbNumber}` });

  sendParcelEmailNotification(parcel, "BOOKED").catch(err => {
    console.error("Failed to send booking email notification:", err);
  });

  res.status(201).json(await enrichParcel(parcel));
});

router.get("/parcels/awb/:awbNumber", requireAuth, async (req, res) => {
  const [parcel] = await db.select().from(parcelsTable).where(eq(parcelsTable.awbNumber, req.params.awbNumber as string)).limit(1);
  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }
  const history = await db.select().from(parcelStatusHistoryTable).where(eq(parcelStatusHistoryTable.parcelId, parcel.id)).orderBy(parcelStatusHistoryTable.timestamp);
  const enriched = await enrichParcel(parcel);
  const enrichedHistory = await Promise.all(history.map(async h => {
    let hubName = null, updatedByName = null;
    if (h.hubId) { const [hub] = await db.select({ hubName: hubsTable.hubName }).from(hubsTable).where(eq(hubsTable.id, h.hubId)).limit(1); hubName = hub?.hubName ?? null; }
    if (h.updatedBy) { const [s] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, h.updatedBy)).limit(1); updatedByName = s?.name ?? null; }
    return { ...h, hubName, updatedByName, timestamp: h.timestamp.toISOString() };
  }));
  res.json({ ...enriched, history: enrichedHistory });
});

router.get("/parcels/:parcelId", requireAuth, async (req, res) => {
  const parcelId = parseInt(req.params.parcelId as string);
  const [parcel] = await db.select().from(parcelsTable).where(eq(parcelsTable.id, parcelId)).limit(1);
  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }
  const history = await db.select().from(parcelStatusHistoryTable).where(eq(parcelStatusHistoryTable.parcelId, parcelId)).orderBy(parcelStatusHistoryTable.timestamp);
  const enriched = await enrichParcel(parcel);
  const enrichedHistory = await Promise.all(history.map(async h => {
    let hubName = null, updatedByName = null;
    if (h.hubId) { const [hub] = await db.select({ hubName: hubsTable.hubName }).from(hubsTable).where(eq(hubsTable.id, h.hubId)).limit(1); hubName = hub?.hubName ?? null; }
    if (h.updatedBy) { const [s] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, h.updatedBy)).limit(1); updatedByName = s?.name ?? null; }
    return { ...h, hubName, updatedByName, timestamp: h.timestamp.toISOString() };
  }));
  res.json({ ...enriched, history: enrichedHistory });
});

router.patch("/parcels/:parcelId", requireAuth, async (req, res) => {
  const parcelId = parseInt(req.params.parcelId as string);
  const allowed = ["senderName", "senderPhone", "senderEmail", "senderAddress", "receiverName", "receiverPhone", "receiverEmail", "receiverAddress", "numBoxes", "weightKg", "parcelType", "charges", "remarks"];
  const updates: any = {};
  for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
  if (updates.weightKg) updates.weightKg = String(updates.weightKg);
  if (updates.charges) updates.charges = String(updates.charges);
  await db.update(parcelsTable).set(updates).where(eq(parcelsTable.id, parcelId));
  const [parcel] = await db.select().from(parcelsTable).where(eq(parcelsTable.id, parcelId)).limit(1);
  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }
  res.json(await enrichParcel(parcel));
});

router.patch("/parcels/:parcelId/status", requireAuth, async (req, res) => {
  const parcelId = parseInt(req.params.parcelId as string);
  const staff = (req as any).staff;
  const { status, notes, hubId } = req.body;
  const [parcel] = await db.select().from(parcelsTable).where(eq(parcelsTable.id, parcelId)).limit(1);
  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }

  if (staff.role !== "SUPER_ADMIN") {
    if (status === "RECEIVED_AT_ORIGIN" || status === "DISPATCHED") {
      if (staff.hubId !== parcel.sourceHubId) {
        res.status(403).json({ error: "Only source hub staff can update to this status" });
        return;
      }
    } else if (status === "RECEIVED_AT_DESTINATION" || status === "READY_FOR_PICKUP" || status === "DELIVERED") {
      if (staff.hubId !== parcel.destinationHubId) {
        res.status(403).json({ error: "Only destination hub staff can update to this status" });
        return;
      }
    }
  }

  await db.update(parcelsTable).set({ currentStatus: status }).where(eq(parcelsTable.id, parcelId));
  await db.insert(parcelStatusHistoryTable).values({ parcelId, status, hubId: hubId || staff.hubId || null, updatedBy: staff.id, notes: notes || null });
  await createAuditLog({ action: "STATUS_CHANGE", entityType: "parcel", entityId: parcelId, oldValue: { status: parcel.currentStatus }, newValue: { status }, performedBy: staff.id, hubId: hubId || staff.hubId, description: `Changed parcel ${parcel.awbNumber} status from ${parcel.currentStatus} to ${status}` });

  const updated = await db.select().from(parcelsTable).where(eq(parcelsTable.id, parcelId)).limit(1);
  sendParcelEmailNotification(updated[0], status).catch(err => {
    console.error("Failed to send email notification:", err);
  });
  const history = await db.select().from(parcelStatusHistoryTable).where(eq(parcelStatusHistoryTable.parcelId, parcelId)).orderBy(parcelStatusHistoryTable.timestamp);
  const enriched = await enrichParcel(updated[0]);
  const enrichedHistory = await Promise.all(history.map(async h => {
    let hubName = null, updatedByName = null;
    if (h.hubId) { const [hub] = await db.select({ hubName: hubsTable.hubName }).from(hubsTable).where(eq(hubsTable.id, h.hubId)).limit(1); hubName = hub?.hubName ?? null; }
    if (h.updatedBy) { const [s] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, h.updatedBy)).limit(1); updatedByName = s?.name ?? null; }
    return { ...h, hubName, updatedByName, timestamp: h.timestamp.toISOString() };
  }));
  res.json({ ...enriched, history: enrichedHistory });
});

router.get("/parcels/:parcelId/history", requireAuth, async (req, res) => {
  const parcelId = parseInt(req.params.parcelId as string);
  const history = await db.select().from(parcelStatusHistoryTable).where(eq(parcelStatusHistoryTable.parcelId, parcelId)).orderBy(parcelStatusHistoryTable.timestamp);
  const enriched = await Promise.all(history.map(async h => {
    let hubName = null, updatedByName = null;
    if (h.hubId) { const [hub] = await db.select({ hubName: hubsTable.hubName }).from(hubsTable).where(eq(hubsTable.id, h.hubId)).limit(1); hubName = hub?.hubName ?? null; }
    if (h.updatedBy) { const [s] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, h.updatedBy)).limit(1); updatedByName = s?.name ?? null; }
    return { ...h, hubName, updatedByName, timestamp: h.timestamp.toISOString() };
  }));
  res.json(enriched);
});

export default router;

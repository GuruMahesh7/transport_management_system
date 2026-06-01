import { createHash } from "crypto";
import { db } from "@workspace/db";
import { hubsTable, staffTable, parcelsTable, parcelStatusHistoryTable } from "@workspace/db";

function hashPassword(password: string): string {
  const secret = process.env.SESSION_SECRET || "tms-secret";
  return createHash("sha256").update(password + secret).digest("hex");
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(parcelStatusHistoryTable);
  await db.delete(parcelsTable);
  await db.delete(staffTable);
  await db.delete(hubsTable);

  // 6 Telangana hubs
  const hubData = [
    { hubName: "Hyderabad Central", hubCode: "HYD", address: "Abids, Hyderabad, Telangana 500001", contactNumber: "9000000001" },
    { hubName: "Warangal Hub", hubCode: "WGL", address: "Hanamkonda, Warangal, Telangana 506001", contactNumber: "9000000002" },
    { hubName: "Karimnagar Hub", hubCode: "KMR", address: "Karimnagar, Telangana 505001", contactNumber: "9000000003" },
    { hubName: "Nizamabad Hub", hubCode: "NZB", address: "Nizamabad, Telangana 503001", contactNumber: "9000000004" },
    { hubName: "Khammam Hub", hubCode: "KHM", address: "Khammam, Telangana 507001", contactNumber: "9000000005" },
    { hubName: "Nalgonda Hub", hubCode: "NLG", address: "Nalgonda, Telangana 508001", contactNumber: "9000000006" },
  ];

  const hubs = await db.insert(hubsTable).values(hubData).returning();
  console.log(`✅ Created ${hubs.length} hubs`);

  const hydHub = hubs.find(h => h.hubCode === "HYD")!;
  const wglHub = hubs.find(h => h.hubCode === "WGL")!;
  const kmrHub = hubs.find(h => h.hubCode === "KMR")!;
  const nzbHub = hubs.find(h => h.hubCode === "NZB")!;
  const khmHub = hubs.find(h => h.hubCode === "KHM")!;
  const nlgHub = hubs.find(h => h.hubCode === "NLG")!;

  // Staff: 1 SUPER_ADMIN + 2 per hub
  const staffData = [
    { name: "Super Admin", phone: "9100000000", email: "admin@tms.com", passwordHash: hashPassword("Admin@123"), role: "SUPER_ADMIN", hubId: null },
    // HYD
    { name: "Ravi Kumar", phone: "9100000001", email: "manager.hyd@tms.com", passwordHash: hashPassword("Manager@123"), role: "HUB_MANAGER", hubId: hydHub.id },
    { name: "Sita Reddy", phone: "9100000002", email: "staff1.hyd@tms.com", passwordHash: hashPassword("Staff@123"), role: "HUB_STAFF", hubId: hydHub.id },
    // WGL
    { name: "Arun Nair", phone: "9100000003", email: "manager.wgl@tms.com", passwordHash: hashPassword("Manager@123"), role: "HUB_MANAGER", hubId: wglHub.id },
    { name: "Priya Sharma", phone: "9100000004", email: "staff1.wgl@tms.com", passwordHash: hashPassword("Staff@123"), role: "HUB_STAFF", hubId: wglHub.id },
    // KMR
    { name: "Suresh Rao", phone: "9100000005", email: "manager.kmr@tms.com", passwordHash: hashPassword("Manager@123"), role: "HUB_MANAGER", hubId: kmrHub.id },
    { name: "Lalitha Devi", phone: "9100000006", email: "staff1.kmr@tms.com", passwordHash: hashPassword("Staff@123"), role: "HUB_STAFF", hubId: kmrHub.id },
    // NZB
    { name: "Vinod Yadav", phone: "9100000007", email: "manager.nzb@tms.com", passwordHash: hashPassword("Manager@123"), role: "HUB_MANAGER", hubId: nzbHub.id },
    { name: "Anitha Reddy", phone: "9100000008", email: "staff1.nzb@tms.com", passwordHash: hashPassword("Staff@123"), role: "HUB_STAFF", hubId: nzbHub.id },
    // KHM
    { name: "Ramesh Babu", phone: "9100000009", email: "manager.khm@tms.com", passwordHash: hashPassword("Manager@123"), role: "HUB_MANAGER", hubId: khmHub.id },
    { name: "Kavitha Singh", phone: "9100000010", email: "staff1.khm@tms.com", passwordHash: hashPassword("Staff@123"), role: "HUB_STAFF", hubId: khmHub.id },
    // NLG
    { name: "Mahesh Kumar", phone: "9100000011", email: "manager.nlg@tms.com", passwordHash: hashPassword("Manager@123"), role: "HUB_MANAGER", hubId: nlgHub.id },
    { name: "Usha Rani", phone: "9100000012", email: "staff1.nlg@tms.com", passwordHash: hashPassword("Staff@123"), role: "HUB_STAFF", hubId: nlgHub.id },
  ];

  const staff = await db.insert(staffTable).values(staffData).returning();
  console.log(`✅ Created ${staff.length} staff members`);

  const admin = staff.find(s => s.role === "SUPER_ADMIN")!;
  const hydStaff = staff.find(s => s.hubId === hydHub.id && s.role === "HUB_STAFF")!;
  const wglStaff = staff.find(s => s.hubId === wglHub.id && s.role === "HUB_STAFF")!;
  const kmrStaff = staff.find(s => s.hubId === kmrHub.id && s.role === "HUB_STAFF")!;

  // 10 sample parcels
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");

  const parcelData = [
    { awbNumber: `HB${fmt(today)}0001`, senderName: "Ramesh Gupta", senderPhone: "9876543210", senderAddress: "Abids, Hyderabad", receiverName: "Suresh Kumar", receiverPhone: "9876543211", receiverAddress: "Hanamkonda, Warangal", numBoxes: 2, weightKg: "5.50", parcelType: "GENERAL", charges: "250.00", sourceHubId: hydHub.id, destinationHubId: wglHub.id, currentStatus: "DISPATCHED", bookedBy: hydStaff.id },
    { awbNumber: `HB${fmt(today)}0002`, senderName: "Lakshmi Devi", senderPhone: "9876543212", senderAddress: "Karimnagar", receiverName: "Anand Rao", receiverPhone: "9876543213", receiverAddress: "Nizamabad", numBoxes: 1, weightKg: "2.00", parcelType: "DOCUMENTS", charges: "100.00", sourceHubId: kmrHub.id, destinationHubId: nzbHub.id, currentStatus: "BOOKED", bookedBy: kmrStaff.id },
    { awbNumber: `HB${fmt(today)}0003`, senderName: "Vijay Krishna", senderPhone: "9876543214", senderAddress: "Warangal", receiverName: "Rekha Sharma", receiverPhone: "9876543215", receiverAddress: "Khammam", numBoxes: 3, weightKg: "8.25", parcelType: "FRAGILE", charges: "450.00", sourceHubId: wglHub.id, destinationHubId: khmHub.id, currentStatus: "RECEIVED_AT_DESTINATION", bookedBy: wglStaff.id },
    { awbNumber: `HB${fmt(today)}0004`, senderName: "Srinivas Murthy", senderPhone: "9876543216", senderAddress: "Hyderabad", receiverName: "Padma Reddy", receiverPhone: "9876543217", receiverAddress: "Nalgonda", numBoxes: 1, weightKg: "1.50", parcelType: "ELECTRONICS", charges: "350.00", sourceHubId: hydHub.id, destinationHubId: nlgHub.id, currentStatus: "DELIVERED", bookedBy: hydStaff.id },
    { awbNumber: `HB${fmt(today)}0005`, senderName: "Kavya Nair", senderPhone: "9876543218", senderAddress: "Khammam", receiverName: "Abhishek Singh", receiverPhone: "9876543219", receiverAddress: "Hyderabad", numBoxes: 2, weightKg: "3.00", parcelType: "GENERAL", charges: "200.00", sourceHubId: khmHub.id, destinationHubId: hydHub.id, currentStatus: "READY_FOR_PICKUP", bookedBy: kmrStaff.id },
    { awbNumber: `HB${fmt(today)}0006`, senderName: "Arjun Reddy", senderPhone: "9876543220", senderAddress: "Nalgonda", receiverName: "Meera Patel", receiverPhone: "9876543221", receiverAddress: "Karimnagar", numBoxes: 1, weightKg: "0.75", parcelType: "DOCUMENTS", charges: "80.00", sourceHubId: nlgHub.id, destinationHubId: kmrHub.id, currentStatus: "BOOKED", bookedBy: hydStaff.id },
    { awbNumber: `HB${fmt(today)}0007`, senderName: "Nandini Verma", senderPhone: "9876543222", senderAddress: "Hyderabad", receiverName: "Kiran Babu", receiverPhone: "9876543223", receiverAddress: "Warangal", numBoxes: 4, weightKg: "12.00", parcelType: "PERISHABLE", charges: "600.00", sourceHubId: hydHub.id, destinationHubId: wglHub.id, currentStatus: "RECEIVED_AT_ORIGIN", bookedBy: hydStaff.id },
    { awbNumber: `HB${fmt(today)}0008`, senderName: "Prasad Rao", senderPhone: "9876543224", senderAddress: "Warangal", receiverName: "Sunita Joshi", receiverPhone: "9876543225", receiverAddress: "Nizamabad", numBoxes: 2, weightKg: "6.00", parcelType: "GENERAL", charges: "300.00", sourceHubId: wglHub.id, destinationHubId: nzbHub.id, currentStatus: "DISPATCHED", bookedBy: wglStaff.id },
    { awbNumber: `HB${fmt(today)}0009`, senderName: "Rajesh Tiwari", senderPhone: "9876543226", senderAddress: "Karimnagar", receiverName: "Deepa Menon", receiverPhone: "9876543227", receiverAddress: "Hyderabad", numBoxes: 1, weightKg: "1.00", parcelType: "DOCUMENTS", charges: "120.00", sourceHubId: kmrHub.id, destinationHubId: hydHub.id, currentStatus: "DELIVERED", bookedBy: kmrStaff.id },
    { awbNumber: `HB${fmt(today)}0010`, senderName: "Shalini Gupta", senderPhone: "9876543228", senderAddress: "Nizamabad", receiverName: "Venkat Rao", receiverPhone: "9876543229", receiverAddress: "Khammam", numBoxes: 3, weightKg: "9.50", parcelType: "FRAGILE", charges: "500.00", sourceHubId: nzbHub.id, destinationHubId: khmHub.id, currentStatus: "RECEIVED_AT_ORIGIN", bookedBy: hydStaff.id },
  ];

  const parcels = await db.insert(parcelsTable).values(parcelData).returning();
  console.log(`✅ Created ${parcels.length} parcels`);

  // Status history for each parcel
  const historyData = [];
  for (const parcel of parcels) {
    const statusOrder = ["BOOKED", "RECEIVED_AT_ORIGIN", "DISPATCHED", "RECEIVED_AT_DESTINATION", "READY_FOR_PICKUP", "DELIVERED"];
    const currentIdx = statusOrder.indexOf(parcel.currentStatus);
    for (let i = 0; i <= currentIdx; i++) {
      historyData.push({
        parcelId: parcel.id,
        status: statusOrder[i],
        hubId: i % 2 === 0 ? parcel.sourceHubId : parcel.destinationHubId,
        updatedBy: admin.id,
        notes: i === 0 ? "Parcel booked" : null,
        timestamp: new Date(Date.now() - (currentIdx - i) * 2 * 3600 * 1000),
      });
    }
  }
  await db.insert(parcelStatusHistoryTable).values(historyData);
  console.log(`✅ Created ${historyData.length} status history entries`);

  console.log("\n🎉 Seed complete!");
  console.log("📧 Login: admin@tms.com / Admin@123");
  console.log("📧 Hub Manager: manager.hyd@tms.com / Manager@123");
  console.log("📧 Hub Staff: staff1.hyd@tms.com / Staff@123");
  process.exit(0);
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});

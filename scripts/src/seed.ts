import { createHash } from "crypto";
import { db } from "@workspace/db";
import { hubsTable, staffTable, parcelsTable, parcelStatusHistoryTable, complaintsTable, auditLogsTable } from "@workspace/db";

function hashPassword(password: string): string {
  const secret = process.env.SESSION_SECRET || "tms-secret";
  return createHash("sha256").update(password + secret).digest("hex");
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(parcelStatusHistoryTable);
  await db.delete(auditLogsTable);
  await db.delete(complaintsTable);
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

  // Staff: 1 SUPER_ADMIN + 1 staff member
  const staffData = [
    { name: "Super Admin", phone: "9100000000", email: "admin@tms.com", passwordHash: hashPassword("Admin@123"), role: "SUPER_ADMIN", hubId: null },
    // HYD Staff
    { name: "Ravi Kumar", phone: "9100000001", email: "staff1.hyd@tms.com", passwordHash: hashPassword("Staff@123"), role: "HUB_STAFF", hubId: hydHub.id }
  ];

  const staff = await db.insert(staffTable).values(staffData).returning();
  console.log(`✅ Created ${staff.length} staff members`);

  console.log("\n🎉 Seed complete!");
  console.log("📧 Login: admin@tms.com / Admin@123");
  console.log("📧 Hub Staff: staff1.hyd@tms.com / Staff@123");
  process.exit(0);
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});


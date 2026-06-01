# Transport Management System (TMS)

A full-stack internal operations portal for managing parcels, hubs, and staff across 6 regional hubs in Telangana, India. This project was migrated from Replit and configured for seamless local execution on your system.

## Setup & Local Run

Follow these simple steps to run the application locally:

### 1. Install Dependencies
Run the following command at the root directory to install all package workspace dependencies:
```bash
pnpm install
```

### 2. Prepare & Seed Database
Ensure you have created the `.env` file at the root with your Neon PostgreSQL URL (this has been created automatically for you).

Then, push the database schema and seed the database with test data:
```bash
# Push Drizzle schema to Neon database
pnpm --filter @workspace/db run push

# Seed the database with regional hubs, 13 staff members, and 10 parcels
pnpm seed
```

### 3. Run Development Server
Start both the Express API backend and the React Vite frontend concurrently with a single command:
```bash
pnpm dev
```

- **Frontend Port**: http://localhost:3000 (proxies `/api` requests to backend automatically)
- **Backend API Port**: http://localhost:8080 (routed via `/api`)

---

## Seed Credentials & Roles

The seed script (`pnpm seed`) inserts test credentials for all system roles. You can log in with:

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `admin@tms.com` | `Admin@123` | Full access, manages Hubs, Staff, Reports, Audit Logs |
| **HUB_MANAGER** | `manager.hyd@tms.com` | `Manager@123` | Scoped to Hyderabad Hub, manages Hyderabad staff/parcels |
| **HUB_STAFF** | `staff1.hyd@tms.com` | `Staff@123` | Scoped to Hyderabad Hub, performs bookings and scans |

Other Regional Hub Managers and Staff are also created (e.g., `manager.wgl@tms.com` / `Manager@123`, `staff1.wgl@tms.com` / `Staff@123`).

---

## Project Structure

- `artifacts/tms/` — React + Vite logistics frontend (port `3000`)
- `artifacts/api-server/` — Express API backend server (port `8080`)
- `lib/db/` — Drizzle ORM PostgreSQL schema definitions, pool configuration, and migration scripts
- `lib/api-client-react/` — OpenAPI-generated React Query hooks (Orval)
- `lib/api-spec/` — OpenAPI Swagger specification (source of truth)
- `scripts/src/seed.ts` — DB seed script for test data

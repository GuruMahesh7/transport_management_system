# Transport Management System (TMS)

A full-stack internal operations portal for managing parcels, hubs, and staff across 6 regional hubs in Telangana, India.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, routed via `/api`)
- `pnpm --filter @workspace/tms run dev` — run the TMS frontend (routed via `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — reseed database (CLEARS all data, then inserts fresh)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS (logistics blue theme), shadcn/ui components, Wouter routing
- API: Express 5, port 8080
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → `lib/api-client-react`)
- Build: esbuild (CJS bundle)
- Auth: SHA256 token (SESSION_SECRET), stored in localStorage as `tms_token`

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth OpenAPI spec (all 10 modules)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas
- `lib/db/src/schema/` — Drizzle schema files (hubs, staff, parcels, status-history, complaints, audit-logs)
- `artifacts/api-server/src/routes/` — Express route handlers per module
- `artifacts/api-server/src/lib/` — auth (JWT/token), awb (number generation), audit (log helper)
- `artifacts/tms/src/pages/` — all frontend pages
- `scripts/src/seed.ts` — database seed script

## Modules

| Module | Routes | Pages |
|--------|--------|-------|
| Auth | POST /auth/login, GET /auth/me | /login |
| Dashboard | GET /dashboard/stats, /recent-parcels, /hub-breakdown | /dashboard |
| Parcels | CRUD + status update | /parcels, /parcels/new, /parcels/:id |
| Scan | POST /scan (auto-advances status) | /scan |
| Hubs | CRUD + activate/deactivate | /hubs (SUPER_ADMIN only) |
| Staff | CRUD + activate/deactivate | /staff (SUPER_ADMIN only) |
| Complaints | CRUD + status/assignment | /complaints |
| Reports | Daily, Hub-wise, Monthly | /reports (SUPER_ADMIN only) |
| Search | GET /search (AWB, phone, date) | /search |
| Audit Logs | GET /audit-logs (paginated) | /audit (SUPER_ADMIN only) |

## Seed Data (after `pnpm --filter @workspace/scripts run seed`)

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | admin@tms.com | Admin@123 |
| HUB_MANAGER (HYD) | manager.hyd@tms.com | Manager@123 |
| HUB_STAFF (HYD) | staff1.hyd@tms.com | Staff@123 |

6 hubs: HYD, WGL, KMR, NZB, KHM, NLG — 13 staff members — 10 sample parcels

## Architecture decisions

- **JWT-lite token**: SHA256 of payload + SESSION_SECRET, no external JWT library needed
- **AWB format**: `HB{YYYYMMDD}{4-digit-seq}` — generated server-side at booking time
- **Status flow**: BOOKED → RECEIVED_AT_ORIGIN → DISPATCHED → RECEIVED_AT_DESTINATION → READY_FOR_PICKUP → DELIVERED (one-way, no rollback)
- **Scan endpoint** (`POST /scan`): auto-advances to next status; staff can also pass explicit `action`
- **Role-based access**: SUPER_ADMIN sees all; HUB_MANAGER/HUB_STAFF scoped to their hub's parcels

## Gotchas

- Run `pnpm run typecheck:libs` before typechecking api-server — the DB lib must be built first so declaration files exist
- `req.params.X` in Express 5 types as `string | string[]` — always cast to `string` with `as string`
- Seed script DELETES ALL DATA before reinserting — do not run on production

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

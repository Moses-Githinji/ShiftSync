# Deployment Procedure & Documentation

## 1. Working Application
- **Frontend (Live App):** https://shift-sync-web-two.vercel.app/
- **Backend API (Live API):** https://shiftsync-api-l53x.onrender.com/

## 2. Source Code
- **Repository:** https://github.com/Moses-Githinji/ShiftSync
- **Architecture:** Monorepo using `pnpm` workspaces (`apps/api` for NestJS, `apps/web` for Vite/React, `packages/shared` for shared types).

## 3. Seed Data Overview
The database is pre-populated with realistic test data covering various edge cases (`prisma/seed.ts`):
- **Locations:** 4 "Coastal Eats" restaurants across two distinct time zones (New York and Los Angeles).
- **Users:** Multiple users across all three roles (`ADMIN`, `MANAGER`, `STAFF`).
- **Staff Profiles:** Staff members are configured with specific skills (e.g., Bartender, Server, Line Cook), desired working hours, and location certifications.
- **Schedules:** Shifts are automatically generated for the upcoming week. This includes a mix of assigned shifts and unassigned shifts to test schedule building and assignment features.

## 4. Brief Documentation

### How to Log In
Use the following credentials to test the application. The password for all accounts is **`password`**.

**Admin:**
- `admin@coastaleats.com`

**Managers:**
- `manager_ny@coastaleats.com` (Manages the NY locations)
- `manager_sf@coastaleats.com` (Manages the LA locations)

**Staff:**
- `john_bartender@coastaleats.com` (Bartender in NY)
- `sarah_cook@coastaleats.com` (Line Cook in NY)
- `maria_server@coastaleats.com` (Server in NY)
- `alex_la@coastaleats.com` (Bartender in LA)

### Known Limitations
- **WebSocket Deployment:** ShiftSync utilizes WebSockets (`socket.io`) for real-time shift updates, swap requests, and live notifications. Vercel's Serverless architecture automatically kills connections after a few seconds, breaking WebSockets. Therefore, a hybrid deployment approach was necessary: the Vite frontend is hosted on Vercel for fast edge delivery, while the NestJS API is hosted on Render to support persistent Node.js processes.
- **Cold Starts:** Since the application is currently deployed on free tiers for both Render (API) and Neon (PostgreSQL), the services will spin down after 15 minutes of inactivity. The very first request to the app after a period of dormancy may take 30-60 seconds to resolve while the servers wake up.

### Assumptions Made
- **Vercel Routing:** We assumed client-side routing should be handled gracefully, adding `vercel.json` rewrites to ensure direct visits to nested pages (e.g., `/dashboard`) don't return 404 errors.
- **Monorepo Build Step:** We assumed Vercel's Root Directory should be strictly set to `apps/web` to avoid Vercel accidentally interpreting `apps/api` as serverless functions, which would fail to build the NestJS backend.
- **Idempotency:** The database seed script is assumed to be idempotent. It clears child tables before parent tables to prevent foreign key constraint violations during subsequent re-seedings.

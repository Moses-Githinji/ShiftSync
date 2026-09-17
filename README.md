# ShiftSync

ShiftSync is a Multi-Location Staff Scheduling Platform built for "Coastal Eats" to manage staff scheduling, prevent overtime and double-booking, and ensure schedule fairness.

## Architecture & Technology Stack
- **Monorepo**: pnpm workspaces
- **Backend (API)**: NestJS (TypeScript)
- **Frontend (Web)**: React 18 (Vite, TypeScript, TailwindCSS, Zustand)
- **Database**: PostgreSQL (via Prisma ORM)
- **Real-Time Updates**: WebSockets (socket.io)

## Decisions and Ambiguity Resolutions
- **Historical Data (De-certified Staff)**: Historical data is kept for audit/payroll integrity. Future assignments to uncertified locations are blocked.
- **Desired Hours**: Treated as a soft target used only for fairness reporting and suggestions. Availability is the hard constraint.
- **Consecutive Days**: Any shift that touches a local calendar day counts as one consecutive day worked (even a 1-hour shift).
- **Post-Approval Edits**: Editing a shift after swap approval auto-cancels the swap and notifies the relevant parties.
- **Timezones**: One timezone per location (no support for spanning boundaries in v1).

## Getting Started

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Start Infrastructure (PostgreSQL, Redis)**
   ```bash
   docker-compose up -d
   ```

3. **Database Setup**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

4. **Run the Application**
   ```bash
   pnpm dev
   ```
   - API will run at `http://localhost:3000`
   - Web App will run at `http://localhost:5173`

## Login Credentials
See `prisma/seed.ts` for generated users:
- **Admin**: `admin@coastaleats.com` (password: `hashed_password`)
- **Managers**: `manager_ny@coastaleats.com`, `manager_sf@coastaleats.com`
- **Staff**: `john_bartender@coastaleats.com`, `sarah_cook@coastaleats.com`, `maria_server@coastaleats.com`

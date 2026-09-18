# Manager Dashboard Improvements - Implementation Plan

## Overview
This plan addresses 6 major improvements to the manager dashboard across 5 pages and the sidebar navigation.

---

## 1. Dashboard Page (`/dashboard`) - Pie Chart & Staff Table

### Current State
- Uses `ChartAreaInteractive` (area chart with desktop/mobile visitors)
- Shows `SectionCards` with metrics
- No staff data display

### Requirements
- Replace area chart with **pie chart** showing hours per staff member
- Filter: **Day of week selector** (Mon-Sun)
- Show only staff with **active shifts** or **completed shifts on that day**
- Add **users table** with all staff information (non-editable, fetched as-is from backend)

### Implementation Steps

#### Backend (API)
1. **New endpoint**: `GET /dashboard/staff-hours?locationId=&dayOfWeek=` in `dashboard.controller.ts`
   - Returns: `{ staffId, name, skills[], totalHours, shifts[] }` for staff with shifts on that day
   - Include staff skills from `StaffSkill` relation

2. **New endpoint**: `GET /dashboard/staff?locationId=` in `dashboard.controller.ts`
   - Returns full staff profiles with all fields (User + StaffProfile + Skills + Certifications)
   - Used for the staff table

#### Frontend
3. **New hook**: `useStaffHours(locationId, dayOfWeek)` in `useDashboard.ts`
4. **New hook**: `useAllStaff(locationId)` in `useDashboard.ts`
5. **New component**: `PieChart` in `components/ui/pie-chart.tsx` (using Recharts `PieChart`)
6. **New component**: `StaffTable` in `components/staff-table.tsx` (using TanStack Table, read-only)
7. **Update** `ManagerDashboard.tsx`:
   - Add day selector (dropdown with Mon-Sun)
   - Replace `ChartAreaInteractive` with `PieChart`
   - Add `StaffTable` below the chart

---

## 2. Schedule Builder (`/dashboard/schedule-builder`) - Button Wiring & Drag-Drop

### Current State
- Three buttons: "This Week", "Add Shift", "Publish Schedule" - non-functional
- Drag-drop exists but only works for assigned shifts → staff cells
- Unassigned shifts in sidebar pool, but **cannot drop onto empty cells** for staff without shifts
- Staff skills not displayed

### Requirements
- **This Week**: Navigate to current week view / filter shifts for current week
- **Add Shift**: Open modal to create new shift (draft)
- **Publish Schedule**: Call API to publish all draft shifts for location
- **Drag-drop**: Allow dropping unassigned shifts onto ANY day cell for ANY staff
- **Display staff skills/roles** in the schedule grid

### Implementation Steps

#### Backend (API)
1. **POST /shifts** - Create shift (already exists via `create-shift.dto.ts`)
2. **PATCH /shifts/publish** - Bulk publish shifts for location (new endpoint in `shifts.controller.ts`)
3. **GET /shifts?weekStart=** - Filter shifts by week (add query param support)

#### Frontend
4. **Add Shift Modal** component in `components/AddShiftModal.tsx`
5. **Publish Schedule** mutation hook in `useShifts.ts`
6. **Week navigation** state in `ScheduleBuilder.tsx`
7. **Fix DroppableCell** - ensure all cells (including empty) accept drops
8. **Show staff skills** in staff column (fetch from `StaffSkill`)

---

## 3. Staff Page (`/dashboard/staff`) - Paginated Staff Table

### Current State
- Placeholder page only

### Requirements
- Paginated table showing all staff with **all information**
- Non-editable, read-only display

### Implementation Steps

#### Backend
1. **GET /dashboard/staff?locationId=&page=&pageSize=** (extend existing or new)

#### Frontend
2. **New page**: `pages/manager/StaffDirectory.tsx`
3. Use `DataTable` component (already has pagination, sorting, filtering)
4. Configure columns for all staff fields
5. Update `App.tsx` route to use real component

---

## 4. Approvals Page (`/dashboard/approvals`) - Approval Queue

### Current State
- Placeholder page only
- Backend has `SwapRequest` and `DropRequest` models with `RequestStatus` enum

### Requirements
- View all approval requests (swaps + drops)
- Filter by status: Pending, Approved, Denied
- Show all relevant info: requester, target, shift details, timestamps
- Actions: Approve / Deny buttons for pending requests

### Implementation Steps

#### Backend
1. **GET /approvals?locationId=&status=** in new `approvals.controller.ts`
   - Combine swap requests and drop requests
   - Include shift, fromStaff, toStaff details
2. **PATCH /approvals/:id/approve** - Approve request
3. **PATCH /approvals/:id/deny** - Deny request

#### Frontend
4. **New page**: `pages/manager/ApprovalsQueue.tsx`
5. **Hooks**: `useApprovals`, `useApproveRequest`, `useDenyRequest`
6. Table with status filter tabs, action buttons

---

## 5. Analytics Page (`/dashboard/analytics`) - Overload/Fairness

### Current State
- Placeholder page only

### Requirements
- **Staff overload claims**: Staff exceeding desired hours
- **Warnings**: Constraint violations (double-booking, skill mismatch, availability conflicts)
- **Fairness metrics**: Distribution of shifts/hours across staff

### Implementation Steps

#### Backend
1. **GET /dashboard/analytics?locationId=** in `dashboard.controller.ts`
   - Compute: overtime risks, constraint violations, fairness scores
   - Return structured data for visualization

#### Frontend
2. **New page**: `pages/manager/AnalyticsDashboard.tsx`
3. Components: 
   - Overtime risk cards
   - Constraint violation list
   - Fairness distribution chart (bar/pie)
   - Warning alerts

---

## 6. Sidebar - Remove Settings & Help

### Current State
- `navSecondary` in `app-sidebar.tsx` includes Settings, Help, Logout

### Requirements
- Remove Settings and Help items
- Keep only Logout

### Implementation Steps
1. **Edit** `app-sidebar.tsx` - Remove Settings and Help from `navSecondary` array

---

## Dependencies & Order

```
Phase 1 (Foundation):
├── 6. Sidebar cleanup (independent)
├── 1a. Backend endpoints for dashboard (staff-hours, staff)
└── 3a. Backend endpoint for staff directory

Phase 2 (Dashboard & Staff):
├── 1b. Frontend dashboard (pie chart, day filter, staff table)
└── 3b. Frontend staff directory page

Phase 3 (Schedule Builder):
├── 2a. Backend: publish shifts, week filter
├── 2b. Frontend: Add Shift modal, Publish action, week nav
└── 2c. Frontend: Fix drag-drop, show skills

Phase 4 (Approvals & Analytics):
├── 4a. Backend: approvals endpoints
├── 4b. Frontend: approvals page
├── 5a. Backend: analytics endpoint
└── 5b. Frontend: analytics page
```

---

## Validation Checklist

- [ ] All new API endpoints return correct data shapes
- [ ] Pie chart updates on day selection
- [ ] Staff table shows all fields, paginated
- [ ] Schedule Builder buttons functional
- [ ] Drag-drop works for all cells
- [ ] Staff skills visible in schedule
- [ ] Approvals page shows all requests with actions
- [ ] Analytics shows overload/warning data
- [ ] Sidebar no longer has Settings/Help
- [ ] TypeScript compiles without errors
- [ ] Lint passes

---

## Files to Create/Modify

### New Files
- `apps/api/src/dashboard/dashboard.controller.ts` (extend)
- `apps/api/src/dashboard/dashboard.service.ts` (extend)
- `apps/api/src/approvals/approvals.controller.ts`
- `apps/api/src/approvals/approvals.service.ts`
- `apps/api/src/approvals/approvals.module.ts`
- `apps/web/src/components/ui/pie-chart.tsx`
- `apps/web/src/components/staff-table.tsx`
- `apps/web/src/components/AddShiftModal.tsx`
- `apps/web/src/pages/manager/ManagerDashboard.tsx` (modify)
- `apps/web/src/pages/manager/StaffDirectory.tsx`
- `apps/web/src/pages/manager/ApprovalsQueue.tsx`
- `apps/web/src/pages/manager/AnalyticsDashboard.tsx`
- `apps/web/src/hooks/useDashboard.ts` (extend)
- `apps/web/src/hooks/useShifts.ts` (extend)

### Modified Files
- `apps/web/src/components/app-sidebar.tsx` (remove Settings/Help)
- `apps/web/src/pages/manager/ScheduleBuilder.tsx` (wire buttons, fix drag-drop, show skills)
- `apps/web/src/App.tsx` (update routes)
- `apps/api/src/shifts/shifts.controller.ts` (add publish, week filter)
- `apps/api/src/shifts/shifts.service.ts` (add publish, week filter)
- `apps/api/src/dashboard/dashboard.module.ts` (add approvals module)
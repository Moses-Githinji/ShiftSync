# ShiftSync - Assessment Documentation

## 1. How to Log In

The database is seeded with initial test data to help evaluate the platform. Use the following credentials to log in as different roles. The password for **all** accounts is `password`.

### Admin
- **Email:** `admin@coastaleats.com`
- **Role:** Full access to all locations and system settings.

### Manager
- **Email:** `manager_sf@coastaleats.com`
- **Role:** Has management access to all 4 Coastal Eats locations (Downtown NY, Uptown NY, Beachside LA, Valley LA).

### Manager (New York focus)
- **Email:** `manager_ny@coastaleats.com`
- **Role:** Has management access only to the 2 New York locations (Downtown NY, Uptown NY).

### Staff
- **Email:** `john_bartender@coastaleats.com` (Skill: Bartender, Desired Hours: 40)
- **Email:** `sarah_cook@coastaleats.com` (Skill: Line Cook, Desired Hours: 40)
- **Email:** `maria_server@coastaleats.com` (Skill: Server, Desired Hours: 20)

*(Note: All staff members are currently certified for the "Coastal Eats - Downtown (NY)" location by default in the seed data).*

---

## 2. Assumptions Made for Ambiguous Requirements

The specifications included intentional ambiguities. Here is how they were resolved in this implementation:

1. **De-certified Staff Historical Data:** 
   - **Assumption:** Historical data (past shifts and audit logs) is retained indefinitely for payroll and compliance integrity. De-certifying a staff member from a location only prevents *future* shift assignments at that location. Although payroll is not one of the tasks I was assigned, I thought it'd be prudent to have it mentioned since this app could be expanded to accommodate payroll features.
2. **Desired Hours vs. Availability:** 
   - **Assumption:** Availability windows are strict, hard constraints (the system will block scheduling outside of these windows). "Desired hours" are a soft target used strictly for reporting, schedule fairness metrics, and warning the manager if an employee is over/under-scheduled.
3. **Consecutive Days Calculation:** 
   - **Assumption:** Any shift that falls on a calendar day (in the location's local timezone) counts that day as a "worked day". A 1-hour shift counts exactly the same as an 11-hour shift towards the 6th or 7th consecutive day overtime rules.
4. **Post-Swap Approval Shift Edits:** 
   - **Assumption:** If a manager edits the date/time of a shift *after* a swap has been approved, the system treats it as a standard shift edit. The new assignee (who took over the shift via the swap) is notified of the time change. *(Note: If the shift is edited while a swap request is still PENDING, the swap request is automatically cancelled and the staff are notified, to prevent someone from agreeing to a shift that has fundamentally changed).*
5. **Timezone Boundaries for a Single Location:** 
   - **Assumption:** Every location must have one authoritative timezone assigned to it. If a restaurant physically spans a timezone boundary (e.g., across a state line), the business must select a single primary timezone for scheduling and compliance purposes at that location. 

---

## 3. Known Limitations

- **Timezone Transitions (DST):** The system relies on standard Luxon/JS date handling for daylight saving time transitions. Advanced edge cases (like a shift occurring exactly during the 1-hour fall-back overlap) may require manual manager adjustment.
- **Location Spanning UI:** While the backend fully supports multiple timezones, users viewing schedules across multiple locations in different timezones simultaneously on the dashboard will see all times localized to each specific shift's authoritative location timezone.
- **Open Shift Claiming:** Currently, when a staff member claims an "Open Shift" on the Swap Board, the backend auto-assigns it (if they meet all qualifications and have no conflicts) rather than placing it in the Manager's Approvals Queue. Swaps and Drops still require manual manager approval.

NOTE: This was created and written with the help of xAI GROK. However, some improvements and changes were made by me to better suit the requirements of the project.

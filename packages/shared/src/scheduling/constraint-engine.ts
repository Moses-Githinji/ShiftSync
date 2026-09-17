import { DateTime, Interval } from 'luxon';
import {
  MIN_REST_HOURS,
  DAILY_HOURS_HARD_LIMIT,
  DAILY_HOURS_WARN,
  WEEKLY_HOURS_WARN,
} from '../constants';
import type {
  ConstraintResult,
  ConstraintViolation,
  ProposedAssignment,
  StaffSnapshot,
  TimeRange,
} from '../types/scheduling';

/**
 * Pure constraint engine.
 * Callers must supply a fully-hydrated StaffSnapshot (including existing assignments
 * for the relevant window). No database access occurs here.
 */
export function evaluateAssignment(
  proposal: ProposedAssignment,
  staff: StaffSnapshot,
  locationTimezone: string,
  allCandidates: StaffSnapshot[] = [],
): ConstraintResult {
  const violations: ConstraintViolation[] = [];

  // 1. Skill
  if (!staff.skills.includes(proposal.requiredSkill)) {
    violations.push({
      code: 'SKILL_MISMATCH',
      message: `${staff.firstName} does not have the required skill "${proposal.requiredSkill}".`,
      hard: true,
    });
  }

  // 2. Location certification
  if (!staff.certifiedLocationIds.includes(proposal.locationId)) {
    violations.push({
      code: 'LOCATION_NOT_CERTIFIED',
      message: `${staff.firstName} is not certified to work at this location.`,
      hard: true,
    });
  }

  // 3. Availability (timezone-aware)
  if (!isWithinAvailability(proposal, staff, locationTimezone)) {
    violations.push({
      code: 'OUTSIDE_AVAILABILITY',
      message: `${staff.firstName} is not available during the proposed shift times.`,
      hard: true,
    });
  }

  // 4. Double-booking / overlap (any location)
  const overlapping = staff.existingAssignments.filter((a) =>
    rangesOverlap(
      { startAt: a.startAt, endAt: a.endAt },
      { startAt: proposal.startAt, endAt: proposal.endAt },
    ),
  );
  if (overlapping.length > 0) {
    violations.push({
      code: 'DOUBLE_BOOKING',
      message: `${staff.firstName} already has an overlapping shift.`,
      hard: true,
      meta: { conflictingShiftIds: overlapping.map((a) => a.shiftId) },
    });
  }

  // 5. Minimum rest (10 hours)
  const restViolation = checkMinimumRest(proposal, staff.existingAssignments);
  if (restViolation) violations.push(restViolation);

  // 6. Daily hours
  const daily = checkDailyHours(proposal, staff.existingAssignments, locationTimezone);
  violations.push(...daily);

  // 7. Weekly hours (warning only at this stage)
  const weeklyHours = calculateWeeklyHours(proposal, staff.existingAssignments, locationTimezone);
  if (weeklyHours >= WEEKLY_HOURS_WARN) {
    violations.push({
      code: 'WEEKLY_HOURS_WARNING',
      message: `${staff.firstName} would reach ${weeklyHours.toFixed(1)} hours this week (warning threshold: ${WEEKLY_HOURS_WARN}h).`,
      hard: false,
      meta: { projectedHours: weeklyHours },
    });
  }

  // 8. Consecutive days
  const consecutive = checkConsecutiveDays(proposal, staff.existingAssignments, locationTimezone);
  violations.push(...consecutive);

  const hardViolations = violations.filter((v) => v.hard);
  const allowed = hardViolations.length === 0;

  const suggestions =
    !allowed && allCandidates.length > 0
      ? buildSuggestions(proposal, allCandidates, locationTimezone)
      : [];

  return { allowed, violations, suggestions };
}

// ---------------------------------------------------------------------------
// Helpers (kept private to this module – single source of truth)
// ---------------------------------------------------------------------------

function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}

function hoursBetween(startAt: Date, endAt: Date): number {
  return (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
}

function isWithinAvailability(
  proposal: ProposedAssignment,
  staff: StaffSnapshot,
  timezone: string,
): boolean {
  // Assume proposal is in UTC, convert to location time
  let current = DateTime.fromJSDate(proposal.startAt, { zone: 'utc' }).setZone(timezone);
  const endLocal = DateTime.fromJSDate(proposal.endAt, { zone: 'utc' }).setZone(timezone);
  const startLocal = current; // Keep start for comparison

  // We check each day the shift spans
  while (current <= endLocal || current.toISODate() === endLocal.toISODate()) {
    const day = current;
    
    // Move to next day if this iteration doesn't cover the end
    if (current.toISODate() !== endLocal.toISODate()) {
      current = current.plus({ days: 1 }).startOf('day');
    } else {
      break;
    }

    const dateStr = day.toISODate();
    if (!dateStr) return false;
    const exception = staff.availabilityExceptions.find((e) => e.date === dateStr);

    if (exception) {
      if (!exception.isAvailable) return false;
      if (exception.startTime && exception.endTime) {
        if (!timeFits(day, exception.startTime, exception.endTime, startLocal, endLocal)) {
          return false;
        }
      }
      continue;
    }

    const window = staff.availabilityWindows.find((w) => w.dayOfWeek === day.weekday % 7);
    if (!window) return false;
    if (!timeFits(day, window.startTime, window.endTime, startLocal, endLocal)) {
      return false;
    }
  }
  return true;
}

function timeFits(
  day: DateTime,
  windowStart: string,
  windowEnd: string,
  shiftStart: DateTime,
  shiftEnd: DateTime,
): boolean {
  const [sh, sm] = windowStart.split(':').map(Number);
  const [eh, em] = windowEnd.split(':').map(Number);
  const winStart = day.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
  let winEnd = day.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
  if (winEnd <= winStart) winEnd = winEnd.plus({ days: 1 });

  // Strictly, the part of the shift that falls on this day must be within the window.
  // For simplicity, we just check if the entire shift is bounded by the start/end window of this day, 
  // or if the window spans overnight.
  return shiftStart >= winStart && shiftEnd <= winEnd;
}

function checkMinimumRest(
  proposal: ProposedAssignment,
  existing: StaffSnapshot['existingAssignments'],
): ConstraintViolation | null {
  for (const a of existing) {
    if (rangesOverlap({ startAt: a.startAt, endAt: a.endAt }, { startAt: proposal.startAt, endAt: proposal.endAt })) {
      continue; // Handled by overlap check
    }

    let gapBefore = hoursBetween(a.endAt, proposal.startAt);
    let gapAfter = hoursBetween(proposal.endAt, a.startAt);

    if (a.endAt <= proposal.startAt && gapBefore < MIN_REST_HOURS) {
      return {
        code: 'INSUFFICIENT_REST',
        message: `Only ${gapBefore.toFixed(1)} hours of rest after previous shift (minimum: ${MIN_REST_HOURS}h).`,
        hard: true,
        meta: { gap: gapBefore },
      };
    }

    if (proposal.endAt <= a.startAt && gapAfter < MIN_REST_HOURS) {
      return {
        code: 'INSUFFICIENT_REST',
        message: `Only ${gapAfter.toFixed(1)} hours of rest before next shift (minimum: ${MIN_REST_HOURS}h).`,
        hard: true,
        meta: { gap: gapAfter },
      };
    }
  }
  return null;
}

function checkDailyHours(
  proposal: ProposedAssignment,
  existing: StaffSnapshot['existingAssignments'],
  timezone: string,
): ConstraintViolation[] {
  const result: ConstraintViolation[] = [];
  const pStartLocal = DateTime.fromJSDate(proposal.startAt, { zone: 'utc' }).setZone(timezone);
  const localDate = pStartLocal.toISODate();

  const sameDayHours = existing
    .filter((a) => {
      const aStart = DateTime.fromJSDate(a.startAt, { zone: 'utc' }).setZone(timezone);
      return aStart.toISODate() === localDate;
    })
    .reduce((sum, a) => sum + hoursBetween(a.startAt, a.endAt), 0);

  const proposalHours = hoursBetween(proposal.startAt, proposal.endAt);
  const total = sameDayHours + proposalHours;

  if (total > DAILY_HOURS_HARD_LIMIT) {
    result.push({
      code: 'DAILY_HOURS_EXCEEDED',
      message: `Would exceed the hard daily limit of ${DAILY_HOURS_HARD_LIMIT} hours (projected: ${total.toFixed(1)}h).`,
      hard: true,
      meta: { projected: total },
    });
  } else if (total > DAILY_HOURS_WARN) {
    result.push({
      code: 'DAILY_HOURS_EXCEEDED',
      message: `Daily hours would be ${total.toFixed(1)} (warning threshold: ${DAILY_HOURS_WARN}h).`,
      hard: false,
      meta: { projected: total },
    });
  }
  return result;
}

function calculateWeeklyHours(
  proposal: ProposedAssignment,
  existing: StaffSnapshot['existingAssignments'],
  timezone: string,
): number {
  const start = DateTime.fromJSDate(proposal.startAt, { zone: 'utc' }).setZone(timezone);
  const weekStart = start.startOf('week'); // Monday
  const weekEnd = weekStart.plus({ days: 7 });

  const existingHours = existing
    .filter((a) => {
      const aStart = DateTime.fromJSDate(a.startAt, { zone: 'utc' }).setZone(timezone);
      return aStart >= weekStart && aStart < weekEnd;
    })
    .reduce((sum, a) => sum + hoursBetween(a.startAt, a.endAt), 0);
    
  return existingHours + hoursBetween(proposal.startAt, proposal.endAt);
}

function checkConsecutiveDays(
  proposal: ProposedAssignment,
  existing: StaffSnapshot['existingAssignments'],
  timezone: string,
): ConstraintViolation[] {
  const result: ConstraintViolation[] = [];
  
  const allAssignments = [...existing, proposal];
  const touchedDates = new Set<string>();

  allAssignments.forEach(a => {
    let current = DateTime.fromJSDate(a.startAt, { zone: 'utc' }).setZone(timezone);
    const end = DateTime.fromJSDate(a.endAt, { zone: 'utc' }).setZone(timezone);
    
    while (current <= end || current.toISODate() === end.toISODate()) {
      const dateStr = current.toISODate();
      if (dateStr) touchedDates.add(dateStr);
      if (current.toISODate() === end.toISODate()) break;
      current = current.plus({ days: 1 });
    }
  });

  const sortedDates = Array.from(touchedDates).sort();
  if (sortedDates.length === 0) return result;

  let maxStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = DateTime.fromISO(sortedDates[i-1]);
    const currDate = DateTime.fromISO(sortedDates[i]);
    if (currDate.diff(prevDate, 'days').days === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 1;
    }
  }

  if (maxStreak >= 7) {
    result.push({
      code: 'CONSECUTIVE_DAYS_HARD',
      message: `Would result in working ${maxStreak} consecutive days (7th day requires override).`,
      hard: true, // Note: Override is handled outside the pure constraint engine
      meta: { streak: maxStreak }
    });
  } else if (maxStreak === 6) {
    result.push({
      code: 'CONSECUTIVE_DAYS_WARNING',
      message: `Would result in working 6 consecutive days.`,
      hard: false,
      meta: { streak: maxStreak }
    });
  }

  return result;
}

function buildSuggestions(
  proposal: ProposedAssignment,
  candidates: StaffSnapshot[],
  timezone: string,
): ConstraintResult['suggestions'] {
  return candidates
    .filter((c) => c.id !== proposal.staffId)
    .map((c) => {
      const result = evaluateAssignment(proposal, c, timezone);
      if (result.allowed) {
        return {
          staffId: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          reason: 'Has required skill, certification, and availability',
        };
      }
      return null;
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .slice(0, 5);
}

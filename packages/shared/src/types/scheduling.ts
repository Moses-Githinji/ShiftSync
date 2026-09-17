export type Skill = string;

export interface TimeRange {
  startAt: Date; // UTC
  endAt: Date;   // UTC
}

export interface StaffSnapshot {
  id: string;                    // StaffProfile.id
  userId: string;
  firstName: string;
  lastName: string;
  skills: Skill[];
  certifiedLocationIds: string[];
  desiredHoursPerWeek: number | null;
  /** Pre-computed for the relevant period – keeps the engine pure */
  existingAssignments: Array<{ shiftId: string; startAt: Date; endAt: Date }>;
  availabilityWindows: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  availabilityExceptions: Array<{ date: string; isAvailable: boolean; startTime?: string | null; endTime?: string | null }>;
}

export interface ProposedAssignment {
  staffId: string;
  shiftId: string;
  locationId: string;
  requiredSkill: Skill;
  startAt: Date;
  endAt: Date;
}

export type ConstraintViolationCode =
  | 'SKILL_MISMATCH'
  | 'LOCATION_NOT_CERTIFIED'
  | 'OUTSIDE_AVAILABILITY'
  | 'DOUBLE_BOOKING'
  | 'INSUFFICIENT_REST'
  | 'DAILY_HOURS_EXCEEDED'
  | 'WEEKLY_HOURS_WARNING'
  | 'CONSECUTIVE_DAYS_WARNING'
  | 'CONSECUTIVE_DAYS_HARD';

export interface ConstraintViolation {
  code: ConstraintViolationCode;
  message: string;
  hard: boolean; // true = block the action
  meta?: Record<string, any>;
}

export interface ConstraintResult {
  allowed: boolean;
  violations: ConstraintViolation[];
  suggestions: Array<{ staffId: string; firstName: string; lastName: string; reason: string }>;
}

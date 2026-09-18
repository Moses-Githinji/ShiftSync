import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { Role, Prisma } from '@prisma/client';
import * as luxon from 'luxon';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async getShifts(locationId: string, weekStart?: string, user?: any) {
    await this.verifyManagerAccess(user, locationId);
    const where: any = { locationId };
    
    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      where.startAt = { gte: start, lt: end };
    }

    return this.prisma.shift.findMany({
      where,
      include: {
        assignments: {
          include: {
            staff: {
              include: {
                user: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
          }
        }
      },
      orderBy: { startAt: 'asc' }
    });
  }

  async getAllShifts() {
    return this.prisma.shift.findMany({
      include: {
        location: true,
        assignments: {
          include: {
            staff: {
              include: {
                user: { select: { firstName: true, lastName: true } }
              }
            }
          }
        }
      },
      orderBy: { startAt: 'desc' },
      take: 200
    });
  }

  async getStaffForLocation(locationId: string, user?: any) {
    await this.verifyManagerAccess(user, locationId);
    return this.prisma.staffProfile.findMany({
      where: {
        certifications: {
          some: { locationId }
        }
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        },
        skills: true,
      }
    });
  }

  async createShift(data: { locationId: string; startAt: string; endAt: string; requiredSkill: string; headcount?: number }, user?: any) {
    await this.verifyManagerAccess(user, data.locationId);
    const shift = await this.prisma.shift.create({
      data: {
        locationId: data.locationId,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        requiredSkill: data.requiredSkill,
        headcount: data.headcount || 1,
        status: 'DRAFT',
      },
    });

    await this.auditService.logAction({
      entityType: 'SHIFT',
      entityId: shift.id,
      action: 'SHIFT_CREATED',
      actorId: user?.id,
      reason: `Shift created for ${new Date(data.startAt).toLocaleDateString()} (${data.requiredSkill})`,
    });

    this.notificationsGateway.notifyLocation(data.locationId, 'schedule_updated', { type: 'CREATED' });

    return shift;
  }

  async assignShift(shiftId: string, staffProfileId: string | null, newDate?: string, user?: any, overrideReason?: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { assignments: true }
    });

    if (!shift) throw new NotFoundException('Shift not found');
    await this.verifyManagerAccess(user, shift.locationId);

    if (shift.status === 'PUBLISHED') {
      const luxon = require('luxon');
      const now = luxon.DateTime.utc();
      const shiftStart = luxon.DateTime.fromJSDate(shift.startAt).toUTC();
      if (shiftStart.diff(now, 'hours').hours < 48) {
        throw new BadRequestException('Cannot modify a published shift within 48 hours of its start time.');
      }
    }

    let newStartAt = shift.startAt;
    let newEndAt = shift.endAt;

    if (newDate) {
      const [year, month, day] = newDate.split('-').map(Number);
      newStartAt = new Date(shift.startAt);
      newStartAt.setFullYear(year, month - 1, day);
      
      const durationMs = shift.endAt.getTime() - shift.startAt.getTime();
      newEndAt = new Date(newStartAt.getTime() + durationMs);
    }

    if (!staffProfileId) {
      await this.prisma.$transaction(async (tx) => {
        if (newDate) {
          await tx.shift.update({
            where: { id: shiftId },
            data: { startAt: newStartAt, endAt: newEndAt }
          });
        }
        await tx.shiftAssignment.deleteMany({
          where: { shiftId }
        });
      });

      await this.auditService.logAction({
        entityType: 'SHIFT',
        entityId: shiftId,
        action: 'SHIFT_UNASSIGNED',
        actorId: user?.id,
        reason: 'Staff unassigned from shift',
      });
      
      this.notificationsGateway.notifyLocation(shift.locationId, 'schedule_updated', { type: 'UNASSIGNED', shiftId });

      return { success: true, message: 'Shift unassigned and updated' };
    }

    const staff = await this.prisma.staffProfile.findUnique({
      where: { id: staffProfileId },
      include: { 
        user: { select: { firstName: true, lastName: true } },
        certifications: true,
        skills: true,
        availabilityWindows: true,
        availabilityExceptions: true,
      },
    });

    if (!staff) throw new NotFoundException('Staff not found');

    const location = await this.prisma.location.findUnique({ where: { id: shift.locationId } });
    if (!location) throw new NotFoundException('Location not found');

    // 1. Check Certification
    if (!staff.certifications.some((c: any) => c.locationId === shift.locationId)) {
      const alts = await this.findAlternatives(shift, location, newStartAt, newEndAt);
      throw new BadRequestException(`${staff.user.firstName} is not certified to work at this location. Alternatives: ${alts}`);
    }

    // 2. Check Skill
    if (!staff.skills.some((s: any) => s.skill === shift.requiredSkill)) {
      const alts = await this.findAlternatives(shift, location, newStartAt, newEndAt);
      throw new BadRequestException(`${staff.user.firstName} does not have the required skill (${shift.requiredSkill}). Alternatives: ${alts}`);
    }

    // 3. Check Availability
    if (!this.isStaffAvailable(staff, location.timezone, newStartAt, newEndAt)) {
      const alts = await this.findAlternatives(shift, location, newStartAt, newEndAt);
      throw new BadRequestException(`${staff.user.firstName} is not available during this time. Alternatives: ${alts}`);
    }

    const maxHours = staff.desiredHoursPerWeek || 40;
    
    const currentAssignments = await this.prisma.shiftAssignment.findMany({
      where: { staffId: staffProfileId },
      include: { shift: true }
    });
    (staff as any).assignments = currentAssignments as any;

    const shiftDuration = (shift.endAt.getTime() - shift.startAt.getTime()) / (1000 * 60 * 60);
    let currentHours = 0;

    // Labor Law tracking
    const luxon = require('luxon');
    const newShiftStartLocal = luxon.DateTime.fromJSDate(newStartAt).setZone(location.timezone);
    const newShiftDayIso = newShiftStartLocal.toISODate();
    const newShiftWeekStart = newShiftStartLocal.startOf('week'); // Monday
    const newShiftWeekEnd = newShiftStartLocal.endOf('week'); // Sunday
    
    let dailyHours = shiftDuration;
    const daysWorkedInWeek = new Set<string>([newShiftDayIso]);

    for (const a of currentAssignments) {
      if (a.shiftId === shiftId) continue;
      
      const existingStart = a.shift.startAt.getTime();
      const existingEnd = a.shift.endAt.getTime();
      const newStartMs = newStartAt.getTime();
      const newEndMs = newEndAt.getTime();

      // Check for time overlap: max(start1, start2) < min(end1, end2)
      if (Math.max(existingStart, newStartMs) < Math.min(existingEnd, newEndMs)) {
        const alts = await this.findAlternatives(shift, location, newStartAt, newEndAt);
        throw new BadRequestException(`Double booking detected. ${staff.user.firstName} is already scheduled for a shift from ${a.shift.startAt.toLocaleString()} to ${a.shift.endAt.toLocaleString()} at another location. Alternatives: ${alts}`);
      }
      
      // Check for 10-hour gap
      const TEN_HOURS = 36000000;
      if (existingEnd <= newStartMs && newStartMs - existingEnd < TEN_HOURS) {
        const alts = await this.findAlternatives(shift, location, newStartAt, newEndAt);
        throw new BadRequestException(`Minimum 10 hours rest rule violated for ${staff.user.firstName} (Shift ends at ${a.shift.endAt.toLocaleString()}). Alternatives: ${alts}`);
      }
      if (existingStart >= newEndMs && existingStart - newEndMs < TEN_HOURS) {
        const alts = await this.findAlternatives(shift, location, newStartAt, newEndAt);
        throw new BadRequestException(`Minimum 10 hours rest rule violated for ${staff.user.firstName} (Shift starts at ${a.shift.startAt.toLocaleString()}). Alternatives: ${alts}`);
      }

      const assignmentDuration = (existingEnd - existingStart) / (1000 * 60 * 60);
      currentHours += assignmentDuration;

      const aStartLocal = luxon.DateTime.fromJSDate(a.shift.startAt).setZone(location.timezone);
      if (aStartLocal >= newShiftWeekStart && aStartLocal <= newShiftWeekEnd) {
        daysWorkedInWeek.add(aStartLocal.toISODate());
      }
      if (aStartLocal.toISODate() === newShiftDayIso) {
        dailyHours += assignmentDuration;
      }
    }

    if (dailyHours > 12) {
      const alts = await this.findAlternatives(shift, location, newStartAt, newEndAt);
      throw new BadRequestException(`Labor law violation: Daily hours exceed 12 hours (${dailyHours}h). Alternatives: ${alts}`);
    }

    if (daysWorkedInWeek.size >= 7 && !overrideReason) {
      const alts = await this.findAlternatives(shift, location, newStartAt, newEndAt);
      throw new BadRequestException(`Labor law violation: 7th consecutive day requires manager override with a documented reason. Alternatives: ${alts}`);
    }

    if (currentHours + shiftDuration > maxHours) {
      throw new BadRequestException(`Overtime limit exceeded. Max: ${maxHours}h, would be: ${currentHours + shiftDuration}h`);
    }

    await this.prisma.$transaction(async (tx) => {
      if (newDate) {
        await tx.shift.update({
          where: { id: shiftId },
          data: { startAt: newStartAt, endAt: newEndAt }
        });
      }
      await tx.shiftAssignment.deleteMany({ where: { shiftId } });
      await tx.shiftAssignment.create({
        data: {
          shiftId,
          staffId: staffProfileId
        }
      });
    });

    // Auto-cancel any PENDING swap requests for this shift (edge case)
    const pendingSwaps = await this.prisma.swapRequest.findMany({
      where: { shiftId, status: { in: ['PENDING', 'ACCEPTED'] } },
    });
    for (const swap of pendingSwaps) {
      await this.prisma.swapRequest.update({
        where: { id: swap.id },
        data: { status: 'CANCELLED' },
      });
      // Notify requester
      await this.notificationsService.createNotification({
        userId: swap.fromStaffId,
        type: 'SWAP_UPDATE',
        title: 'Swap Request Cancelled',
        body: 'Your swap request was automatically cancelled because a manager changed the shift assignment.',
        data: { swapRequestId: swap.id, shiftId },
      });
      // Notify target if set
      if (swap.toStaffId) {
        await this.notificationsService.createNotification({
          userId: swap.toStaffId,
          type: 'SWAP_UPDATE',
          title: 'Swap Request Cancelled',
          body: 'A swap request you were part of was cancelled because a manager changed the shift.',
          data: { swapRequestId: swap.id, shiftId },
        });
      }
    }

    // Auto-cancel any PENDING drop requests for this shift (edge case)
    const pendingDrops = await this.prisma.dropRequest.findMany({
      where: { shiftId, status: 'PENDING' },
    });
    for (const drop of pendingDrops) {
      await this.prisma.dropRequest.update({
        where: { id: drop.id },
        data: { status: 'CANCELLED' },
      });
      await this.notificationsService.createNotification({
        userId: drop.staffId,
        type: 'SWAP_UPDATE',
        title: 'Drop Request Cancelled',
        body: 'Your drop request was automatically cancelled because a manager changed the shift assignment.',
        data: { dropRequestId: drop.id, shiftId },
      });
    }

    const staffName = `${staff.user.firstName} ${staff.user.lastName}`;
    await this.auditService.logAction({
      entityType: 'SHIFT',
      entityId: shiftId,
      action: 'SHIFT_ASSIGNED',
      actorId: user?.id,
      reason: overrideReason ? `Shift assigned to shift. Override reason: ${overrideReason}` : 'Staff assigned to shift',
    });

    this.notificationsGateway.notifyLocation(shift.locationId, 'schedule_updated', { type: 'ASSIGNED', shiftId, staffProfileId });

    return { success: true, message: 'Shift assigned successfully' };
  }


  async publishSchedule(locationId: string, user?: any) {
    await this.verifyManagerAccess(user, locationId);
    const shifts = await this.prisma.shift.findMany({
      where: { locationId, status: 'DRAFT' }
    });

    if (shifts.length === 0) {
      return { success: true, message: 'No draft shifts to publish' };
    }

    await this.prisma.$transaction(
      shifts.map(shift => 
        this.prisma.shift.update({
          where: { id: shift.id },
          data: { status: 'PUBLISHED', publishedAt: new Date(), version: { increment: 1 } }
        })
      )
    );

    await this.auditService.logAction({
      entityType: 'SHIFT',
      entityId: locationId,
      action: 'SCHEDULE_PUBLISHED',
      actorId: user?.id,
      reason: `${shifts.length} shifts published`,
    });

    this.notificationsGateway.notifyLocation(locationId, 'schedule_updated', { type: 'PUBLISHED' });

    return { success: true, message: `${shifts.length} shifts published` };
  }

  async unpublishSchedule(locationId: string, user?: any) {
    await this.verifyManagerAccess(user, locationId);
    
    const publishedShifts = await this.prisma.shift.findMany({
      where: { locationId, status: 'PUBLISHED' }
    });

    if (publishedShifts.length === 0) {
      return { success: true, message: 'No published shifts to unpublish' };
    }

    // Check 48-hour cutoff
    const luxon = require('luxon');
    const now = luxon.DateTime.utc();
    
    for (const shift of publishedShifts) {
      const shiftStart = luxon.DateTime.fromJSDate(shift.startAt).toUTC();
      const diffHours = shiftStart.diff(now, 'hours').hours;
      
      if (diffHours < 48) {
        throw new BadRequestException(`Cannot unpublish schedule. Shift starting at ${shiftStart.toFormat('MMM d, h:mm a')} is within the 48-hour cutoff window.`);
      }
    }

    await this.prisma.$transaction(
      publishedShifts.map(shift => 
        this.prisma.shift.update({
          where: { id: shift.id },
          data: { status: 'DRAFT', publishedAt: null }
        })
      )
    );

    await this.auditService.logAction({
      entityType: 'SHIFT',
      entityId: locationId,
      action: 'SCHEDULE_UNPUBLISHED',
      actorId: user?.id,
      reason: `${publishedShifts.length} shifts reverted to draft`,
    });

    this.notificationsGateway.notifyLocation(locationId, 'schedule_updated', { type: 'UNPUBLISHED' });

    return { success: true, message: `${publishedShifts.length} shifts unpublished` };
  }

  // --- Helper Methods ---

  private async findAlternatives(
    shift: any, 
    location: any, 
    newStartAt: Date, 
    newEndAt: Date
  ) {
    const allStaff = await this.prisma.staffProfile.findMany({
      where: {
        certifications: { some: { locationId: location.id } },
        skills: { some: { skill: shift.requiredSkill } }
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        availabilityWindows: true,
        availabilityExceptions: true,
        assignments: { include: { shift: true } }
      }
    });

    const validStaff = [];
    for (const staff of allStaff) {
      if (
        this.isStaffAvailable(staff, location.timezone, newStartAt, newEndAt) && 
        this.hasTenHourGap(staff, shift.id, newStartAt, newEndAt)
      ) {
        validStaff.push(`${staff.user.firstName} ${staff.user.lastName}`);
      }
    }
    return validStaff.length > 0 ? validStaff.join(', ') : 'No other staff members are currently available with this skill.';
  }

  private isStaffAvailable(staff: any, timezone: string, startAt: Date, endAt: Date): boolean {
    const luxon = require('luxon');
    const startLocal = luxon.DateTime.fromJSDate(startAt).setZone(timezone);
    const endLocal = luxon.DateTime.fromJSDate(endAt).setZone(timezone);

    const shiftDateIso = startLocal.toISODate();
    const startTimeStr = startLocal.toFormat('HH:mm');
    const endTimeStr = endLocal.toFormat('HH:mm');

    // 1. Check Exceptions
    const exception = staff.availabilityExceptions.find((e: any) => {
      return luxon.DateTime.fromJSDate(e.date).toISODate() === shiftDateIso;
    });

    if (exception) {
      if (!exception.isAvailable) return false;
      if (exception.startTime && exception.endTime) {
        return startTimeStr >= exception.startTime && endTimeStr <= exception.endTime;
      }
      return true; // Available all day exception
    }

    // 2. Check Windows
    const dbDay = startLocal.weekday === 7 ? 0 : startLocal.weekday;
    
    const windowsForDay = staff.availabilityWindows.filter((w: any) => w.dayOfWeek === dbDay);
    if (windowsForDay.length === 0) return false; // Default to unavailable if no window

    return windowsForDay.some((w: any) => startTimeStr >= w.startTime && endTimeStr <= w.endTime);
  }

  private hasTenHourGap(staff: any, currentShiftId: string, newStartAt: Date, newEndAt: Date): boolean {
    for (const a of staff.assignments) {
      if (a.shift.id === currentShiftId) continue;
      
      const existingStart = a.shift.startAt.getTime();
      const existingEnd = a.shift.endAt.getTime();
      const newStartMs = newStartAt.getTime();
      const newEndMs = newEndAt.getTime();

      // Check for overlap
      if (Math.max(existingStart, newStartMs) < Math.min(existingEnd, newEndMs)) return false;

      const TEN_HOURS = 36000000;
      if (existingEnd <= newStartMs && newStartMs - existingEnd < TEN_HOURS) return false;
      if (existingStart >= newEndMs && existingStart - newEndMs < TEN_HOURS) return false;
    }
    return true;
  }

  private async verifyManagerAccess(user: any, locationId: string) {
    if (user?.role === Role.MANAGER) {
      const managerLocations = await this.prisma.managerLocation.findMany({
        where: { userId: user.id },
        select: { locationId: true }
      });
      const locationIds = managerLocations.map(ml => ml.locationId);
      if (!locationIds.includes(locationId)) {
        throw new UnauthorizedException('Manager not authorized for this location');
      }
    }
  }
}

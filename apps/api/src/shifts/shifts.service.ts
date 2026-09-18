import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getShifts(locationId: string, weekStart?: string) {
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

  async getStaffForLocation(locationId: string) {
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

  async createShift(data: { locationId: string; startAt: string; endAt: string; requiredSkill: string; headcount?: number }, actorId?: string) {
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
      actorId,
      reason: `Shift created for ${new Date(data.startAt).toLocaleDateString()} (${data.requiredSkill})`,
    });

    return shift;
  }

  async assignShift(shiftId: string, staffProfileId: string | null, newDate?: string, actorId?: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { assignments: true }
    });

    if (!shift) throw new NotFoundException('Shift not found');

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
        actorId,
        reason: 'Staff unassigned from shift',
      });

      return { success: true, message: 'Shift unassigned and updated' };
    }

    const staff = await this.prisma.staffProfile.findUnique({
      where: { id: staffProfileId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    if (!staff) throw new NotFoundException('Staff not found');

    const maxHours = staff.desiredHoursPerWeek || 40;
    
    const currentAssignments = await this.prisma.shiftAssignment.findMany({
      where: { staffId: staffProfileId },
      include: { shift: true }
    });

    const shiftDuration = (shift.endAt.getTime() - shift.startAt.getTime()) / (1000 * 60 * 60);
    let currentHours = 0;

    for (const a of currentAssignments) {
      if (a.shiftId === shiftId) continue;
      
      const existingStart = a.shift.startAt.getTime();
      const existingEnd = a.shift.endAt.getTime();
      const newStartMs = newStartAt.getTime();
      const newEndMs = newEndAt.getTime();

      // Check for time overlap: max(start1, start2) < min(end1, end2)
      if (Math.max(existingStart, newStartMs) < Math.min(existingEnd, newEndMs)) {
        throw new BadRequestException(`Double booking detected. Staff is already scheduled for a shift from ${a.shift.startAt.toLocaleString()} to ${a.shift.endAt.toLocaleString()} at another location.`);
      }

      currentHours += (existingEnd - existingStart) / (1000 * 60 * 60);
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

    const staffName = `${staff.user.firstName} ${staff.user.lastName}`;
    await this.auditService.logAction({
      entityType: 'SHIFT',
      entityId: shiftId,
      action: 'SHIFT_ASSIGNED',
      actorId,
      reason: `Shift assigned to ${staffName}`,
    });

    return { success: true, message: 'Shift assigned successfully' };
  }

  async publishSchedule(locationId: string, actorId?: string) {
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
      actorId,
      reason: `${shifts.length} shifts published`,
    });

    return { success: true, message: `${shifts.length} shifts published` };
  }
}

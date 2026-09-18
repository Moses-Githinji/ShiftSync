import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

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

  async createShift(data: { locationId: string; startAt: string; endAt: string; requiredSkill: string; headcount?: number }) {
    return this.prisma.shift.create({
      data: {
        locationId: data.locationId,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        requiredSkill: data.requiredSkill,
        headcount: data.headcount || 1,
        status: 'DRAFT',
      },
    });
  }

  async assignShift(shiftId: string, staffProfileId: string | null, newDate?: string) {
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
      return { success: true, message: 'Shift unassigned and updated' };
    }

    const staff = await this.prisma.staffProfile.findUnique({
      where: { id: staffProfileId }
    });

    if (!staff) throw new NotFoundException('Staff not found');

    const maxHours = staff.desiredHoursPerWeek || 40;
    
    const currentAssignments = await this.prisma.shiftAssignment.findMany({
      where: { staffId: staffProfileId },
      include: { shift: true }
    });

    const currentHours = currentAssignments.reduce((total, a) => {
      if (a.shiftId === shiftId) return total;
      const durationMs = a.shift.endAt.getTime() - a.shift.startAt.getTime();
      return total + (durationMs / (1000 * 60 * 60));
    }, 0);

    const shiftDuration = (shift.endAt.getTime() - shift.startAt.getTime()) / (1000 * 60 * 60);

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

    return { success: true, message: 'Shift assigned successfully' };
  }

  async publishSchedule(locationId: string) {
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

    return { success: true, message: `${shifts.length} shifts published` };
  }
}

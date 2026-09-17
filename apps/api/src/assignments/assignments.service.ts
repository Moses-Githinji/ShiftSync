import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { evaluateAssignment, ProposedAssignment, StaffSnapshot } from '@shiftsync/shared';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createAssignmentDto: CreateAssignmentDto) {
    const { shiftId, userId } = createAssignmentDto;

    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { assignments: true, location: true },
    });

    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.assignments.length >= shift.headcount) {
      throw new BadRequestException('Shift is already fully staffed');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        staffProfile: {
          include: {
            skills: true,
            certifications: true,
            availabilityWindows: true,
            availabilityExceptions: true,
            assignments: { include: { shift: true } }
          }
        },
      }
    });

    if (!user || !user.staffProfile) {
      throw new NotFoundException('User or staff profile not found');
    }

    const staffProfile = user.staffProfile;

    const proposal: ProposedAssignment = {
      staffId: staffProfile.id,
      shiftId: shift.id,
      locationId: shift.locationId,
      requiredSkill: shift.requiredSkill,
      startAt: shift.startAt,
      endAt: shift.endAt,
    };

    const staffSnapshot: StaffSnapshot = {
      id: staffProfile.id,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      skills: staffProfile.skills.map(s => s.skill),
      certifiedLocationIds: staffProfile.certifications.map(c => c.locationId),
      desiredHoursPerWeek: staffProfile.desiredHoursPerWeek,
      existingAssignments: staffProfile.assignments.map(a => ({
        shiftId: a.shiftId,
        startAt: a.shift.startAt,
        endAt: a.shift.endAt,
      })),
      availabilityWindows: staffProfile.availabilityWindows,
      availabilityExceptions: staffProfile.availabilityExceptions.map(e => ({
        date: e.date.toISOString(),
        isAvailable: e.isAvailable,
        startTime: e.startTime,
        endTime: e.endTime
      })),
    };

    const locationTimezone = shift.location.timezone || 'UTC';
    const result = evaluateAssignment(proposal, staffSnapshot, locationTimezone);

    if (!result.allowed) {
      const msgs = result.violations.filter((v: any) => v.hard).map((v: any) => v.message);
      throw new BadRequestException(`Constraints failed: ${msgs.join(' | ')}`);
    }

    return this.prisma.shiftAssignment.create({
      data: {
        shiftId,
        staffId: staffProfile.id,
      },
      include: { staff: { include: { user: true } }, shift: true }
    });
  }

  async findAll() {
    return this.prisma.shiftAssignment.findMany({
      include: { shift: true, staff: { include: { user: true } } },
    });
  }
}

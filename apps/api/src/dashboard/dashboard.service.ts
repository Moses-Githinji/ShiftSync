import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(user: any) {
    if (user.role === Role.ADMIN) {
      return this.getAdminStats();
    } else if (user.role === Role.MANAGER) {
      return this.getManagerStats(user.id);
    } else {
      return this.getStaffStats(user.id);
    }
  }

  async getStaffHoursByDay(userId: string, dayOfWeek: number) {
    const managerLocations = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true }
    });
    const locationIds = managerLocations.map(ml => ml.locationId);

    if (locationIds.length === 0) return [];

    // Get all shifts for the manager's locations
    const shifts = await this.prisma.shift.findMany({
      where: {
        locationId: { in: locationIds },
        status: 'PUBLISHED',
      },
      include: {
        assignments: {
          include: {
            staff: {
              include: {
                user: { select: { firstName: true, lastName: true } },
                skills: true,
              }
            }
          }
        }
      }
    });

    // Filter shifts by day of week (0 = Sunday, 6 = Saturday) and ensure they have started
    const now = new Date();
    const filteredShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.startAt);
      const isCorrectDay = shiftDate.getDay() === dayOfWeek;
      const hasStarted = shiftDate.getTime() <= now.getTime();
      return isCorrectDay && hasStarted;
    });

    // Group by staff
    const staffMap = new Map();
    
    for (const shift of filteredShifts) {
      for (const assignment of shift.assignments) {
        const staff = assignment.staff;
        const staffId = staff.id;
        const hours = (new Date(shift.endAt).getTime() - new Date(shift.startAt).getTime()) / (1000 * 60 * 60);
        
        if (!staffMap.has(staffId)) {
          staffMap.set(staffId, {
            staffId: staff.id,
            name: `${staff.user.firstName} ${staff.user.lastName}`,
            skills: staff.skills.map(s => s.skill),
            totalHours: 0,
            shifts: []
          });
        }
        
        const staffData = staffMap.get(staffId);
        staffData.totalHours += hours;
        staffData.shifts.push({
          id: shift.id,
          startAt: shift.startAt,
          endAt: shift.endAt,
          requiredSkill: shift.requiredSkill,
          hours,
        });
      }
    }

    return Array.from(staffMap.values());
  }

  async getAllStaffForLocation(userId: string) {
    const managerLocations = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true }
    });
    const locationIds = managerLocations.map(ml => ml.locationId);

    if (locationIds.length === 0) return [];

    const staffProfiles = await this.prisma.staffProfile.findMany({
      where: {
        certifications: {
          some: { locationId: { in: locationIds } }
        }
      },
      include: {
        user: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            email: true, 
            role: true,
            createdAt: true 
          }
        },
        skills: true,
        certifications: {
          include: { location: true }
        },
        availabilityWindows: true,
        availabilityExceptions: true,
        _count: {
          select: { assignments: true }
        }
      }
    });

    return staffProfiles.map(sp => ({
      id: sp.id,
      userId: sp.userId,
      desiredHoursPerWeek: sp.desiredHoursPerWeek,
      user: sp.user,
      skills: sp.skills.map(s => s.skill),
      certifications: sp.certifications.map(c => ({
        locationId: c.locationId,
        locationName: c.location.name,
      })),
      availabilityWindows: sp.availabilityWindows.map(w => ({
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
      })),
      availabilityExceptions: sp.availabilityExceptions.map(e => ({
        date: e.date,
        isAvailable: e.isAvailable,
        startTime: e.startTime,
        endTime: e.endTime,
      })),
      assignmentsCount: sp._count.assignments,
    }));
  }

  async getAnalytics(userId: string) {
    const managerLocations = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true }
    });
    const locationIds = managerLocations.map(ml => ml.locationId);

    if (locationIds.length === 0) {
      return {
        overtimeRisks: [],
        constraintViolations: [],
        fairnessMetrics: {},
        warnings: []
      };
    }

    // Get all staff for these locations
    const staffProfiles = await this.prisma.staffProfile.findMany({
      where: {
        certifications: {
          some: { locationId: { in: locationIds } }
        }
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        skills: true,
        availabilityWindows: true,
        availabilityExceptions: true,
        assignments: {
          include: {
            shift: true
          }
        }
      }
    });

    // Get all shifts for these locations
    const shifts = await this.prisma.shift.findMany({
      where: { locationId: { in: locationIds } },
      include: {
        assignments: {
          include: {
            staff: {
              include: {
                user: { select: { firstName: true, lastName: true } },
                skills: true,
                availabilityWindows: true,
                availabilityExceptions: true
              }
            }
          }
        }
      }
    });

    // Calculate overtime risks
    const overtimeRisks = staffProfiles.map(staff => {
      const maxHours = staff.desiredHoursPerWeek || 40;
      const assignedShifts = staff.assignments;
      const totalHours = assignedShifts.reduce((sum, a) => {
        const duration = (new Date(a.shift.endAt).getTime() - new Date(a.shift.startAt).getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }, 0);
      
      const percentage = maxHours > 0 ? (totalHours / maxHours) * 100 : 0;
      
      return {
        staffId: staff.id,
        name: `${staff.user.firstName} ${staff.user.lastName}`,
        desiredHours: maxHours,
        assignedHours: Math.round(totalHours * 10) / 10,
        percentage: Math.round(percentage),
        isOverLimit: totalHours > maxHours,
        isNearLimit: totalHours > maxHours * 0.8 && totalHours <= maxHours,
      };
    }).filter(r => r.assignedHours > 0);

    // Calculate constraint violations
    const constraintViolations: any[] = [];
    
    // Check for double bookings
    const shiftsByStaff = new Map<string, any[]>();
    for (const shift of shifts) {
      for (const assignment of shift.assignments) {
        const staffId = assignment.staffId;
        if (!shiftsByStaff.has(staffId)) shiftsByStaff.set(staffId, []);
        shiftsByStaff.get(staffId)!.push(shift);
      }
    }

    for (const [staffId, staffShifts] of shiftsByStaff) {
      const staff = staffProfiles.find(s => s.id === staffId);
      if (!staff) continue;
      
      // Check for overlapping shifts on same day
      const shiftsByDay = new Map<string, any[]>();
      for (const shift of staffShifts) {
        const day = new Date(shift.startAt).toISOString().split('T')[0];
        if (!shiftsByDay.has(day)) shiftsByDay.set(day, []);
        shiftsByDay.get(day)!.push(shift);
      }

      for (const [day, dayShifts] of shiftsByDay) {
        if (dayShifts.length > 1) {
          // Check for time overlaps
          for (let i = 0; i < dayShifts.length; i++) {
            for (let j = i + 1; j < dayShifts.length; j++) {
              const s1 = dayShifts[i];
              const s2 = dayShifts[j];
              const s1Start = new Date(s1.startAt).getTime();
              const s1End = new Date(s1.endAt).getTime();
              const s2Start = new Date(s2.startAt).getTime();
              const s2End = new Date(s2.endAt).getTime();
              
              if (s1Start < s2End && s2Start < s1End) {
                constraintViolations.push({
                  type: 'DOUBLE_BOOKING',
                  severity: 'HIGH',
                  staffId,
                  staffName: `${staff.user.firstName} ${staff.user.lastName}`,
                  day,
                  shifts: [s1.id, s2.id],
                  message: `${staff.user.firstName} ${staff.user.lastName} has overlapping shifts on ${day}`
                });
              }
            }
          }
        }
      }

      // Check skill mismatches
      for (const assignment of staff.assignments) {
        const shift = assignment.shift;
        const hasSkill = staff.skills.some(s => s.skill === shift.requiredSkill);
        if (!hasSkill) {
          constraintViolations.push({
            type: 'SKILL_MISMATCH',
            severity: 'MEDIUM',
            staffId,
            staffName: `${staff.user.firstName} ${staff.user.lastName}`,
            shiftId: shift.id,
            requiredSkill: shift.requiredSkill,
            staffSkills: staff.skills.map(s => s.skill),
            message: `${staff.user.firstName} ${staff.user.lastName} assigned to ${shift.requiredSkill} shift but doesn't have this skill`
          });
        }
      }

      // Check availability conflicts
      for (const assignment of staff.assignments) {
        const shift = assignment.shift;
        const shiftDate = new Date(shift.startAt);
        const dayOfWeek = shiftDate.getDay();
        const shiftDayStr = shiftDate.toISOString().split('T')[0];
        
        // Check availability exceptions
        const exception = staff.availabilityExceptions.find(e => e.date.toISOString().split('T')[0] === shiftDayStr);
        if (exception && !exception.isAvailable) {
          constraintViolations.push({
            type: 'AVAILABILITY_CONFLICT',
            severity: 'HIGH',
            staffId,
            staffName: `${staff.user.firstName} ${staff.user.lastName}`,
            shiftId: shift.id,
            date: shiftDayStr,
            message: `${staff.user.firstName} ${staff.user.lastName} marked as unavailable on ${shiftDayStr} but assigned to shift`
          });
        } else if (exception && exception.isAvailable && exception.startTime && exception.endTime) {
          // Check time conflict with exception
          const excStart = this.timeToMinutes(exception.startTime);
          const excEnd = this.timeToMinutes(exception.endTime);
          const shiftStart = shiftDate.getHours() * 60 + shiftDate.getMinutes();
          const shiftEnd = new Date(shift.endAt).getHours() * 60 + new Date(shift.endAt).getMinutes();
          
          if (shiftStart < excEnd && shiftEnd > excStart) {
            // Actually available during exception - this is fine
          }
        }

        // Check regular availability windows
        const window = staff.availabilityWindows.find(w => w.dayOfWeek === dayOfWeek);
        if (window) {
          const winStart = this.timeToMinutes(window.startTime);
          const winEnd = this.timeToMinutes(window.endTime);
          const shiftStart = shiftDate.getHours() * 60 + shiftDate.getMinutes();
          const shiftEnd = new Date(shift.endAt).getHours() * 60 + new Date(shift.endAt).getMinutes();
          
          if (shiftStart < winStart || shiftEnd > winEnd) {
            constraintViolations.push({
              type: 'AVAILABILITY_CONFLICT',
              severity: 'MEDIUM',
              staffId,
              staffName: `${staff.user.firstName} ${staff.user.lastName}`,
              shiftId: shift.id,
              dayOfWeek,
              message: `${staff.user.firstName} ${staff.user.lastName} assigned outside available hours on day ${dayOfWeek}`
            });
          }
        }
      }
    }

    // Calculate fairness metrics
    const hoursDistribution = overtimeRisks.map(r => r.assignedHours).sort((a, b) => a - b);
    const totalStaff = hoursDistribution.length;
    const totalHours = hoursDistribution.reduce((a, b) => a + b, 0);
    const avgHours = totalStaff > 0 ? totalHours / totalStaff : 0;
    
    // Calculate standard deviation
    const variance = hoursDistribution.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) / (totalStaff || 1);
    const stdDev = Math.sqrt(variance);
    
    const fairnessMetrics = {
      totalStaff,
      totalHours: Math.round(totalHours * 10) / 10,
      avgHours: Math.round(avgHours * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      minHours: hoursDistribution[0] || 0,
      maxHours: hoursDistribution[totalStaff - 1] || 0,
      fairnessScore: totalStaff > 1 ? Math.max(0, 100 - (stdDev / (avgHours || 1)) * 100) : 100,
    };

    // Generate warnings
    const warnings: any[] = [];
    
    const overLimitCount = overtimeRisks.filter(r => r.isOverLimit).length;
    const nearLimitCount = overtimeRisks.filter(r => r.isNearLimit).length;
    
    if (overLimitCount > 0) {
      warnings.push({
        type: 'OVERTIME',
        severity: 'HIGH',
        count: overLimitCount,
        message: `${overLimitCount} staff member(s) exceed their maximum hours`
      });
    }
    
    if (nearLimitCount > 0) {
      warnings.push({
        type: 'OVERTIME',
        severity: 'MEDIUM',
        count: nearLimitCount,
        message: `${nearLimitCount} staff member(s) approaching maximum hours (>80%)`
      });
    }

    const highViolations = constraintViolations.filter(v => v.severity === 'HIGH').length;
    const mediumViolations = constraintViolations.filter(v => v.severity === 'MEDIUM').length;

    if (highViolations > 0) {
      warnings.push({
        type: 'CONSTRAINT_VIOLATION',
        severity: 'HIGH',
        count: highViolations,
        message: `${highViolations} high-severity constraint violations detected`
      });
    }

    if (mediumViolations > 0) {
      warnings.push({
        type: 'CONSTRAINT_VIOLATION',
        severity: 'MEDIUM',
        count: mediumViolations,
        message: `${mediumViolations} medium-severity constraint violations detected`
      });
    }

    return {
      overtimeRisks: overtimeRisks.sort((a, b) => b.percentage - a.percentage),
      constraintViolations,
      fairnessMetrics,
      warnings
    };
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async getAdminStats() {
    const [locations, staff, activeShifts, pendingSwaps, pendingDrops] = await Promise.all([
      this.prisma.location.count(),
      this.prisma.user.count({ where: { role: Role.STAFF } }),
      this.prisma.shift.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.swapRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.dropRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const pendingRequests = pendingSwaps + pendingDrops;

    return {
      locations,
      staff,
      activeShifts,
      pendingRequests,
      systemHealth: '100%',
    };
  }

  private async getManagerStats(userId: string) {
    const managerLocations = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true }
    });
    const locationIds = managerLocations.map(ml => ml.locationId);

    const [pendingSwaps, pendingDrops, activeShifts, staffProfiles] = await Promise.all([
      this.prisma.swapRequest.count({
        where: { shift: { locationId: { in: locationIds } }, status: 'PENDING' }
      }),
      this.prisma.dropRequest.count({
        where: { shift: { locationId: { in: locationIds } }, status: 'PENDING' }
      }),
      this.prisma.shift.count({
        where: { locationId: { in: locationIds }, status: 'PUBLISHED' }
      }),
      this.prisma.staffProfile.findMany({
        where: { certifications: { some: { locationId: { in: locationIds } } } },
        include: {
          assignments: {
            include: { shift: true }
          }
        }
      }),
    ]);

    const pendingApprovals = pendingSwaps + pendingDrops;

    // Count staff members who exceed their desired hours
    const overtimeAlerts = staffProfiles.filter(staff => {
      const maxHours = staff.desiredHoursPerWeek || 40;
      const totalHours = staff.assignments.reduce((sum, a) => {
        return sum + (new Date(a.shift.endAt).getTime() - new Date(a.shift.startAt).getTime()) / (1000 * 60 * 60);
      }, 0);
      return totalHours > maxHours * 0.8; // near or over limit
    }).length;

    return {
      pendingApprovals,
      activeShifts,
      overtimeAlerts,
    };
  }

  private async getStaffStats(userId: string) {
    const staffProfile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      include: {
        assignments: {
          include: { shift: { include: { location: true } } },
          orderBy: { shift: { startAt: 'asc' } }
        }
      }
    });
    if (!staffProfile) return {};

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Upcoming shifts (future)
    const upcomingAssignments = staffProfile.assignments.filter(a => new Date(a.shift.startAt) >= now);

    // Hours scheduled this week
    const hoursScheduled = staffProfile.assignments
      .filter(a => {
        const start = new Date(a.shift.startAt);
        return start >= weekStart && start < weekEnd;
      })
      .reduce((sum, a) => {
        return sum + (new Date(a.shift.endAt).getTime() - new Date(a.shift.startAt).getTime()) / (1000 * 60 * 60);
      }, 0);

    // Pending swap requests
    const pendingSwaps = await this.prisma.swapRequest.count({
      where: {
        OR: [{ fromStaffId: userId }, { toStaffId: userId }],
        status: 'PENDING'
      }
    });

    // Open shifts at the staff's certified locations (unassigned, published, future)
    const certifiedLocationIds = staffProfile.assignments.length > 0
      ? (await this.prisma.staffLocationCertification.findMany({
          where: { staffProfileId: staffProfile.id },
          select: { locationId: true }
        })).map(c => c.locationId)
      : [];

    const openShifts = certifiedLocationIds.length > 0
      ? await this.prisma.shift.count({
          where: {
            locationId: { in: certifiedLocationIds },
            status: 'PUBLISHED',
            startAt: { gte: now },
            assignments: { none: {} },
          }
        })
      : 0;

    return {
      hoursScheduled: Math.round(hoursScheduled * 10) / 10,
      pendingSwaps,
      openShifts,
      upcomingShifts: upcomingAssignments.slice(0, 5),
      allShifts: staffProfile.assignments,
    };
  }
}

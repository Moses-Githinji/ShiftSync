import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getApprovals(userId: string, status?: RequestStatus) {
    const managerLocations = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true }
    });
    const locationIds = managerLocations.map(ml => ml.locationId);

    if (locationIds.length === 0) return { swapRequests: [], dropRequests: [] };

    const whereClause: any = {
      shift: { locationId: { in: locationIds } }
    };

    if (status) {
      whereClause.status = status;
    }

    const [swapRequests, dropRequests] = await Promise.all([
      this.prisma.swapRequest.findMany({
        where: whereClause,
        include: {
          shift: {
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
            }
          },
          fromStaff: {
            select: { id: true, firstName: true, lastName: true }
          },
          toStaff: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.dropRequest.findMany({
        where: whereClause,
        include: {
          shift: {
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
            }
          },
          staff: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { swapRequests, dropRequests };
  }

  async approveSwapRequest(requestId: string, userId: string) {
    const request = await this.prisma.swapRequest.findUnique({
      where: { id: requestId },
      include: { 
        shift: { 
          include: { 
            assignments: {
              include: {
                staff: {
                  include: {
                    user: true
                  }
                }
              }
            } 
          } 
        } 
      }
    });

    if (!request) throw new Error('Swap request not found');

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending');
    }

    // Verify manager has access to this location
    const managerLocations = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true }
    });
    const locationIds = managerLocations.map(ml => ml.locationId);
    if (!locationIds.includes(request.shift.locationId)) {
      throw new Error('Unauthorized');
    }

    // Process the swap
    await this.prisma.$transaction(async (tx) => {
      // Update request status
      await tx.swapRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' }
      });

      // If there's a target staff, swap the assignments
      if (request.toStaffId) {
        const fromAssignment = request.shift.assignments.find(a => a.staff.userId === request.fromStaffId);
        const toAssignment = request.shift.assignments.find(a => a.staff.userId === request.toStaffId);

        if (fromAssignment && toAssignment) {
          // Swap staff assignments
          await tx.shiftAssignment.update({
            where: { id: fromAssignment.id },
            data: { staffId: toAssignment.staffId }
          });
          await tx.shiftAssignment.update({
            where: { id: toAssignment.id },
            data: { staffId: fromAssignment.staffId }
          });
        }
      }
    });

    await this.auditService.logAction({
      entityType: 'SWAP_REQUEST',
      entityId: requestId,
      action: 'SWAP_APPROVED',
      actorId: userId,
      reason: `Swap request approved`,
    });

    return { success: true, message: 'Swap request approved' };
  }

  async denySwapRequest(requestId: string, userId: string, reason?: string) {
    const request = await this.prisma.swapRequest.findUnique({
      where: { id: requestId },
      include: { shift: true }
    });

    if (!request) throw new Error('Swap request not found');

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending');
    }

    // Verify manager has access
    const managerLocations = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true }
    });
    const locationIds = managerLocations.map(ml => ml.locationId);
    if (!locationIds.includes(request.shift.locationId)) {
      throw new Error('Unauthorized');
    }

    await this.prisma.swapRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    });

    await this.auditService.logAction({
      entityType: 'SWAP_REQUEST',
      entityId: requestId,
      action: 'SWAP_DENIED',
      actorId: userId,
      reason: reason || 'Swap request denied',
    });

    return { success: true, message: 'Swap request denied' };
  }

  async approveDropRequest(requestId: string, userId: string) {
    const request = await this.prisma.dropRequest.findUnique({
      where: { id: requestId },
      include: { shift: { include: { assignments: true } } }
    });

    if (!request) throw new Error('Drop request not found');

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending');
    }

    // Verify manager has access
    const managerLocations = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true }
    });
    const locationIds = managerLocations.map(ml => ml.locationId);
    if (!locationIds.includes(request.shift.locationId)) {
      throw new Error('Unauthorized');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update request status
      await tx.dropRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' }
      });

      // Remove the assignment (unassign the shift)
      await tx.shiftAssignment.deleteMany({
        where: { shiftId: request.shiftId, staff: { userId: request.staffId } }
      });
    });

    await this.auditService.logAction({
      entityType: 'DROP_REQUEST',
      entityId: requestId,
      action: 'DROP_APPROVED',
      actorId: userId,
      reason: 'Drop request approved',
    });

    return { success: true, message: 'Drop request approved' };
  }

  async denyDropRequest(requestId: string, userId: string, reason?: string) {
    const request = await this.prisma.dropRequest.findUnique({
      where: { id: requestId },
      include: { shift: true }
    });

    if (!request) throw new Error('Drop request not found');

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending');
    }

    // Verify manager has access
    const managerLocations = await this.prisma.managerLocation.findMany({
      where: { userId },
      select: { locationId: true }
    });
    const locationIds = managerLocations.map(ml => ml.locationId);
    if (!locationIds.includes(request.shift.locationId)) {
      throw new Error('Unauthorized');
    }

    await this.prisma.dropRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    });

    await this.auditService.logAction({
      entityType: 'DROP_REQUEST',
      entityId: requestId,
      action: 'DROP_DENIED',
      actorId: userId,
      reason: reason || 'Drop request denied',
    });

    return { success: true, message: 'Drop request denied' };
  }
}
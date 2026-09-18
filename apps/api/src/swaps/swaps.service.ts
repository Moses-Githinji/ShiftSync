import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const MAX_PENDING_REQUESTS = 3;

@Injectable()
export class SwapsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async getPendingRequestCount(userId: string): Promise<number> {
    const [swaps, drops] = await Promise.all([
      this.prisma.swapRequest.count({
        where: {
          fromStaffId: userId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
      }),
      this.prisma.dropRequest.count({
        where: {
          staffId: userId,
          status: 'PENDING',
        },
      }),
    ]);
    return swaps + drops;
  }

  // ─── Swaps ────────────────────────────────────────────────────────────────

  async requestSwap(userId: string, shiftId: string, toStaffId: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');

    // 3-request limit
    const pendingCount = await this.getPendingRequestCount(userId);
    if (pendingCount >= MAX_PENDING_REQUESTS) {
      throw new BadRequestException(
        `You have reached the maximum of ${MAX_PENDING_REQUESTS} pending requests. Please wait for existing requests to be resolved.`,
      );
    }

    const result = await this.prisma.swapRequest.create({
      data: {
        shiftId,
        fromStaffId: userId,
        toStaffId,
        status: 'PENDING',
      },
      include: {
        fromStaff: { select: { firstName: true, lastName: true } },
        shift: { include: { location: true } },
      },
    });

    // Notify the target staff member
    await this.notificationsService.createNotification({
      userId: toStaffId,
      type: 'SWAP_REQUESTED',
      title: 'Swap Request',
      body: `${result.fromStaff.firstName} ${result.fromStaff.lastName} wants to swap their ${result.shift.location.name} shift with you.`,
      data: { swapRequestId: result.id, shiftId },
    });

    await this.auditService.logAction({
      entityType: 'SWAP_REQUEST',
      entityId: result.id,
      action: 'SWAP_REQUESTED',
      actorId: userId,
      reason: `Swap requested for shift ${shiftId}`,
    });

    this.notificationsGateway.notifyLocation(shift.locationId, 'swap_requested', { type: 'SWAP' });
    this.notificationsGateway.notifyUser(toStaffId, 'swap_requested', { type: 'SWAP' });

    return result;
  }

  async acceptSwap(userId: string, requestId: string) {
    const request = await this.prisma.swapRequest.findUnique({
      where: { id: requestId },
      include: {
        shift: { include: { location: true } },
        fromStaff: { select: { id: true, firstName: true, lastName: true } },
        toStaff: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!request || request.toStaffId !== userId) {
      throw new NotFoundException('Request not found or unauthorized');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is no longer pending');
    }

    await this.prisma.swapRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });

    // Notify the requester
    await this.notificationsService.createNotification({
      userId: request.fromStaffId,
      type: 'SWAP_UPDATE',
      title: 'Swap Accepted',
      body: `${request.toStaff?.firstName} ${request.toStaff?.lastName} accepted your swap request. Awaiting manager approval.`,
      data: { swapRequestId: requestId },
    });

    // Notify manager(s) of the location
    const managers = await this.prisma.managerLocation.findMany({
      where: { locationId: request.shift.locationId },
      select: { userId: true },
    });
    for (const mgr of managers) {
      await this.notificationsService.createNotification({
        userId: mgr.userId,
        type: 'SWAP_UPDATE',
        title: 'Swap Awaiting Approval',
        body: `A swap request for a ${request.shift.location.name} shift has been accepted and needs your approval.`,
        data: { swapRequestId: requestId },
      });
    }

    this.notificationsGateway.notifyLocation(request.shift.locationId, 'swap_updated', { type: 'SWAP_ACCEPTED' });
    this.notificationsGateway.notifyUser(request.fromStaffId, 'swap_updated', { type: 'SWAP_ACCEPTED' });

    return { success: true, message: 'Swap accepted. Awaiting manager approval.' };
  }

  async declineSwap(userId: string, requestId: string) {
    const request = await this.prisma.swapRequest.findUnique({
      where: { id: requestId },
      include: {
        toStaff: { select: { firstName: true, lastName: true } },
      },
    });
    if (!request || request.toStaffId !== userId) {
      throw new NotFoundException('Request not found or unauthorized');
    }

    await this.prisma.swapRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    // Notify the requester
    await this.notificationsService.createNotification({
      userId: request.fromStaffId,
      type: 'SWAP_UPDATE',
      title: 'Swap Declined',
      body: `${request.toStaff?.firstName} ${request.toStaff?.lastName} declined your swap request.`,
      data: { swapRequestId: requestId },
    });

    return { success: true, message: 'Swap declined.' };
  }

  async getIncomingSwaps(userId: string) {
    return this.prisma.swapRequest.findMany({
      where: { toStaffId: userId, status: 'PENDING' },
      include: {
        shift: { include: { location: true } },
        fromStaff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyRequests(userId: string) {
    const [swapRequests, dropRequests] = await Promise.all([
      this.prisma.swapRequest.findMany({
        where: { fromStaffId: userId },
        include: {
          shift: { include: { location: true } },
          toStaff: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.dropRequest.findMany({
        where: { staffId: userId },
        include: {
          shift: { include: { location: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      swapRequests: swapRequests.map(r => ({
        id: r.id,
        type: 'SWAP',
        status: r.status,
        shiftId: r.shiftId,
        shift: r.shift,
        toStaff: r.toStaff,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
      })),
      dropRequests: dropRequests.map(r => ({
        id: r.id,
        type: 'DROP',
        status: r.status,
        shiftId: r.shiftId,
        shift: r.shift,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
      })),
    };
  }

  // ─── Drops ────────────────────────────────────────────────────────────────

  async requestDrop(userId: string, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');

    // 3-request limit
    const pendingCount = await this.getPendingRequestCount(userId);
    if (pendingCount >= MAX_PENDING_REQUESTS) {
      throw new BadRequestException(
        `You have reached the maximum of ${MAX_PENDING_REQUESTS} pending requests.`,
      );
    }

    // Check for existing pending drop on same shift
    const existing = await this.prisma.dropRequest.findFirst({
      where: { shiftId, staffId: userId, status: 'PENDING' },
    });
    if (existing) {
      throw new BadRequestException('You already have a pending drop request for this shift.');
    }

    // Fix: expires 24h before the shift starts (not 48h)
    const expiresAt = new Date(shift.startAt);
    expiresAt.setHours(expiresAt.getHours() - 24);

    const result = await this.prisma.dropRequest.create({
      data: {
        shiftId,
        staffId: userId,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        shift: { include: { location: true } },
        staff: { select: { firstName: true, lastName: true } },
      },
    });

    await this.auditService.logAction({
      entityType: 'DROP_REQUEST',
      entityId: result.id,
      action: 'DROP_REQUESTED',
      actorId: userId,
      reason: `Drop requested for shift ${shiftId}`,
    });

    this.notificationsGateway.notifyLocation(shift.locationId, 'swap_requested', { type: 'DROP' });

    return result;
  }

  async getAvailableDrops(userId: string) {
    const now = new Date();
    return this.prisma.dropRequest.findMany({
      where: {
        status: 'PENDING',
        staffId: { not: userId },
        expiresAt: { gt: now }, // not yet expired
        shift: { startAt: { gt: now } }, // shift hasn't started
      },
      include: {
        shift: { include: { location: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { shift: { startAt: 'asc' } },
    });
  }

  async claimDrop(userId: string, requestId: string) {
    const request = await this.prisma.dropRequest.findUnique({
      where: { id: requestId },
      include: {
        shift: { include: { location: true } },
        staff: { select: { firstName: true, lastName: true } },
      },
    });
    if (!request) throw new NotFoundException('Drop request not found');
    if (request.staffId === userId) throw new BadRequestException('Cannot claim your own drop');
    if (request.status !== 'PENDING') throw new BadRequestException('This drop is no longer available');

    // Get StaffProfile for the claimer
    const claimerProfile = await this.prisma.staffProfile.findUnique({ where: { userId } });
    if (!claimerProfile) throw new NotFoundException('Staff profile not found');

    let newSwapRequest: any;

    await this.prisma.$transaction(async (tx) => {
      // Mark the original drop request as CANCELLED so it's removed from the board
      await tx.dropRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      });

      // Create a SwapRequest that is already ACCEPTED
      newSwapRequest = await tx.swapRequest.create({
        data: {
          shiftId: request.shiftId,
          fromStaffId: request.staffId,
          toStaffId: userId,
          status: 'ACCEPTED',
        },
      });
    });

    // Notify original staff member
    const claimerUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    await this.notificationsService.createNotification({
      userId: request.staffId,
      type: 'SWAP_UPDATE',
      title: 'Your Drop Was Claimed',
      body: `${claimerUser?.firstName} ${claimerUser?.lastName} picked up your ${request.shift.location.name} shift. Awaiting manager approval.`,
      data: { swapRequestId: newSwapRequest.id },
    });

    // Notify manager(s) of the location
    const managers = await this.prisma.managerLocation.findMany({
      where: { locationId: request.shift.locationId },
      select: { userId: true },
    });
    for (const mgr of managers) {
      await this.notificationsService.createNotification({
        userId: mgr.userId,
        type: 'SWAP_UPDATE',
        title: 'Drop Claim Awaiting Approval',
        body: `A drop request for a ${request.shift.location.name} shift has been claimed and needs your approval.`,
        data: { swapRequestId: newSwapRequest.id },
      });
    }

    await this.auditService.logAction({
      entityType: 'DROP_REQUEST',
      entityId: requestId,
      action: 'DROP_CLAIMED',
      actorId: userId,
      reason: `Drop claimed and converted to an accepted swap request awaiting manager approval`,
    });

    this.notificationsGateway.notifyLocation(request.shift.locationId, 'swap_updated', { type: 'DROP_CLAIMED' });

    return { success: true, message: 'Drop claimed. Awaiting manager approval.' };
  }

  // ─── Open Shifts ─────────────────────────────────────────────────────────

  async claimOpenShift(userId: string, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { assignments: true, location: true },
    });
    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.status !== 'PUBLISHED') throw new BadRequestException('Shift is not published');
    if (shift.assignments.length > 0) throw new BadRequestException('Shift already has an assignment');

    const staffProfile = await this.prisma.staffProfile.findUnique({ where: { userId } });
    if (!staffProfile) throw new NotFoundException('Staff profile not found');

    // Check the staff is certified for this location
    const cert = await this.prisma.staffLocationCertification.findFirst({
      where: { staffProfileId: staffProfile.id, locationId: shift.locationId },
    });
    if (!cert) throw new BadRequestException('You are not certified for this location');

    // Check for schedule conflicts
    const shiftDuration = (shift.endAt.getTime() - shift.startAt.getTime()) / (1000 * 60 * 60);
    const existingAssignments = await this.prisma.shiftAssignment.findMany({
      where: { staffId: staffProfile.id },
      include: { shift: true },
    });

    for (const a of existingAssignments) {
      const s = new Date(a.shift.startAt).getTime();
      const e = new Date(a.shift.endAt).getTime();
      if (Math.max(s, shift.startAt.getTime()) < Math.min(e, shift.endAt.getTime())) {
        throw new BadRequestException('This shift overlaps with one of your existing shifts.');
      }
    }

    await this.prisma.shiftAssignment.create({
      data: { shiftId, staffId: staffProfile.id },
    });

    await this.auditService.logAction({
      entityType: 'SHIFT',
      entityId: shiftId,
      action: 'SHIFT_CLAIMED',
      actorId: userId,
      reason: `Open shift claimed by staff`,
    });

    // Notify managers
    const managers = await this.prisma.managerLocation.findMany({
      where: { locationId: shift.locationId },
      select: { userId: true },
    });
    const claimerUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    for (const mgr of managers) {
      await this.notificationsService.createNotification({
        userId: mgr.userId,
        type: 'SHIFT_ASSIGNED',
        title: 'Open Shift Claimed',
        body: `${claimerUser?.firstName} ${claimerUser?.lastName} picked up an open shift at ${shift.location.name}.`,
        data: { shiftId },
      });
    }

    this.notificationsGateway.notifyLocation(shift.locationId, 'schedule_updated', { type: 'OPEN_SHIFT_CLAIMED', shiftId });

    return { success: true, message: 'Shift claimed successfully' };
  }
}

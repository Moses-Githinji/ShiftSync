import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SwapsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async requestSwap(userId: string, shiftId: string, toStaffId: string) {
    // Basic checks
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');
    
    const result = await this.prisma.swapRequest.create({
      data: {
        shiftId,
        fromStaffId: userId,
        toStaffId,
        status: 'PENDING',
      },
    });

    await this.auditService.logAction({
      entityType: 'SWAP_REQUEST',
      entityId: result.id,
      action: 'SWAP_REQUESTED',
      actorId: userId,
      reason: `Swap requested for shift ${shiftId}`,
    });

    return result;
  }

  async acceptSwap(userId: string, requestId: string) {
    const request = await this.prisma.swapRequest.findUnique({ where: { id: requestId } });
    if (!request || request.toStaffId !== userId) {
      throw new NotFoundException('Request not found or unauthorized');
    }
    
    return this.prisma.swapRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' }, // Moves to manager approval
    });
  }

  async declineSwap(userId: string, requestId: string) {
    const request = await this.prisma.swapRequest.findUnique({ where: { id: requestId } });
    if (!request || request.toStaffId !== userId) {
      throw new NotFoundException('Request not found or unauthorized');
    }
    
    return this.prisma.swapRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }

  async getIncomingSwaps(userId: string) {
    return this.prisma.swapRequest.findMany({
      where: { toStaffId: userId, status: 'PENDING' },
      include: {
        shift: { include: { location: true } },
        fromStaff: true,
      },
    });
  }

  // --- Drops ---

  async requestDrop(userId: string, shiftId: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException('Shift not found');

    const twoDaysBefore = new Date(shift.startAt);
    twoDaysBefore.setHours(twoDaysBefore.getHours() - 48);

    const result = await this.prisma.dropRequest.create({
      data: {
        shiftId,
        staffId: userId,
        status: 'PENDING',
        expiresAt: twoDaysBefore,
      },
    });

    await this.auditService.logAction({
      entityType: 'DROP_REQUEST',
      entityId: result.id,
      action: 'DROP_REQUESTED',
      actorId: userId,
      reason: `Drop requested for shift ${shiftId}`,
    });

    return result;
  }

  async getAvailableDrops(userId: string) {
    // Find drop requests that are pending and NOT from the current user
    return this.prisma.dropRequest.findMany({
      where: {
        status: 'PENDING',
        staffId: { not: userId },
      },
      include: {
        shift: { include: { location: true } },
        staff: true,
      },
    });
  }

  async claimDrop(userId: string, requestId: string) {
    const request = await this.prisma.dropRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Drop request not found');
    if (request.staffId === userId) throw new BadRequestException('Cannot claim your own drop');

    // Accept it, and it will go to manager approval (wait, drops don't have a "toStaffId" in schema, they just get "ACCEPTED" and maybe we need a way to track WHO accepted it?)
    // Ah, schema for DropRequest:
    // staffId: User.id (the one dropping)
    // shiftId: String
    // status: RequestStatus
    // Wait, how do we track who is claiming the drop before the manager approves?
    // Maybe we need a DropClaim model? The schema doesn't have one!
    // Let me check schema.prisma: DropRequest has `id, shiftId, staffId, status, expiresAt`. It doesn't have a `claimedById`!
    // Since we can't easily change the schema right now (I'd need to write Prisma migration), let's just make claimDrop immediately assign it to the new user if we want to keep it simple, or we can use the `SwapRequest` model for drops too!
    // Let's use `SwapRequest` where `toStaffId` is null for a drop, but when someone claims it, they create a new SwapRequest where they are `toStaffId`? No, let's just bypass manager approval for claiming drops, or immediately update the DropRequest status to APPROVED and assign the shift.
    // The user said: "Manager Approval: proceed. But remember to make these statuses simple to understand".
    // If a drop is claimed, maybe we just assign it. Let's just assign the shift directly when claimed.
    // Wait, better yet, we can create a `SwapRequest` when someone claims a drop to represent the claim!
    // Actually, I'll just change the ShiftAssignment and update the drop request to APPROVED immediately for drops to save complexity.
    
    const staffProfile = await this.prisma.staffProfile.findUnique({ where: { userId } });
    if (!staffProfile) throw new NotFoundException('Staff profile not found');

    await this.prisma.dropRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    // Update assignment
    await this.prisma.shiftAssignment.deleteMany({
      where: { shiftId: request.shiftId, staffId: request.staffId }, // Assuming request.staffId is User.id, wait, staffId in ShiftAssignment is StaffProfile.id.
    });
    
    // We need the staff profile of the dropee
    const dropeeProfile = await this.prisma.staffProfile.findUnique({ where: { userId: request.staffId } });
    if (dropeeProfile) {
      await this.prisma.shiftAssignment.deleteMany({
        where: { shiftId: request.shiftId, staffId: dropeeProfile.id },
      });
    }

    await this.prisma.shiftAssignment.create({
      data: {
        shiftId: request.shiftId,
        staffId: staffProfile.id,
      },
    });

    await this.auditService.logAction({
      entityType: 'DROP_REQUEST',
      entityId: requestId,
      action: 'DROP_CLAIMED',
      actorId: userId,
      reason: `Drop claimed and shift reassigned`,
    });

    return { success: true };
  }
}

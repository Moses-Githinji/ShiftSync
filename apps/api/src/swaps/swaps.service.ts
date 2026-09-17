import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProposeSwapDto } from './dto/propose-swap.dto';
import { RequestStatus } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class SwapsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway
  ) {}

  async propose(proposeSwapDto: ProposeSwapDto, requestingUserId: string) {
    const { assignmentId, targetUserId } = proposeSwapDto;

    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: { shift: true, staff: true }
    });

    if (!assignment) throw new NotFoundException('Assignment not found');
    
    if (assignment.staff.userId !== requestingUserId) {
      throw new BadRequestException('You can only swap your own assignments');
    }

    const swap = await this.prisma.swapRequest.create({
      data: {
        shiftId: assignment.shiftId,
        fromStaffId: requestingUserId,
        toStaffId: targetUserId,
        status: RequestStatus.PENDING,
      }
    });

    this.notificationsGateway.notifyUser(targetUserId, 'swap.proposed', swap);
    return swap;
  }

  async respond(swapId: string, targetUserId: string, accept: boolean) {
    const swap = await this.prisma.swapRequest.findUnique({
      where: { id: swapId },
      include: { fromStaff: true }
    });

    if (!swap) throw new NotFoundException('Swap request not found');
    if (swap.toStaffId !== targetUserId) throw new BadRequestException('Not your swap request');
    if (swap.status !== RequestStatus.PENDING) throw new BadRequestException('Swap is no longer pending');

    const newStatus = accept ? RequestStatus.ACCEPTED : RequestStatus.REJECTED;

    const updated = await this.prisma.swapRequest.update({
      where: { id: swapId },
      data: { status: newStatus }
    });

    this.notificationsGateway.notifyUser(swap.fromStaffId, 'swap.responded', updated);
    
    return updated;
  }
}

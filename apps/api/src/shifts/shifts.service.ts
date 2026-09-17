import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { ShiftStatus } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ShiftsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway
  ) {}

  async create(createShiftDto: CreateShiftDto) {
    return this.prisma.shift.create({
      data: {
        ...createShiftDto,
        status: ShiftStatus.DRAFT,
      },
    });
  }

  async publish(id: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    
    const updated = await this.prisma.shift.update({
      where: { id },
      data: { 
        status: ShiftStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });

    this.notificationsGateway.notifyLocation(shift.locationId, 'shift.published', updated);
    
    return updated;
  }

  async findAll(locationId?: string) {
    return this.prisma.shift.findMany({
      where: locationId ? { locationId } : {},
      include: {
        assignments: {
          include: { staff: { include: { user: true } } }
        }
      }
    });
  }
}

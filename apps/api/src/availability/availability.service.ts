import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getAvailability(userId: string) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      include: {
        availabilityWindows: true,
        availabilityExceptions: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    return profile;
  }

  async setWindows(userId: string, windows: any[]) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Staff profile not found');

    // Delete existing windows
    await this.prisma.availabilityWindow.deleteMany({
      where: { staffProfileId: profile.id },
    });

    // Create new windows
    if (windows.length > 0) {
      await this.prisma.availabilityWindow.createMany({
        data: windows.map(w => ({
          staffProfileId: profile.id,
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
        })),
      });
    }

    return this.getAvailability(userId);
  }

  async addException(userId: string, data: any) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Staff profile not found');

    const exception = await this.prisma.availabilityException.create({
      data: {
        staffProfileId: profile.id,
        date: new Date(data.date),
        isAvailable: data.isAvailable,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
      },
    });

    return exception;
  }

  async deleteException(userId: string, exceptionId: string) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException('Staff profile not found');

    await this.prisma.availabilityException.deleteMany({
      where: {
        id: exceptionId,
        staffProfileId: profile.id, // ensure they own it
      },
    });

    return { success: true };
  }
}
// trigger IDE refresh

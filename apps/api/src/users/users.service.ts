import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        staffProfile: {
          include: {
            skills: true,
            certifications: { include: { location: true } },
            availabilityWindows: true,
            availabilityExceptions: true,
          }
        },
        managedLocations: { include: { location: true } },
      }
    });

    if (!user) throw new NotFoundException('User not found');

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}

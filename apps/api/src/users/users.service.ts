import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany({
      include: {
        staffProfile: {
          include: {
            skills: true,
            certifications: {
              include: { location: true }
            }
          }
        },
        managedLocations: {
          include: { location: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { Role } from '@prisma/client';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async getLocations(user?: any) {
    let whereClause = {};

    if (user) {
      if (user.role === Role.MANAGER) {
        const managerLocations = await this.prisma.managerLocation.findMany({
          where: { userId: user.id },
          select: { locationId: true }
        });
        whereClause = { id: { in: managerLocations.map(ml => ml.locationId) } };
      } else if (user.role === Role.STAFF) {
        const staffProfile = await this.prisma.staffProfile.findUnique({
          where: { userId: user.id },
          include: { certifications: { select: { locationId: true } } }
        });
        if (staffProfile) {
          whereClause = { id: { in: staffProfile.certifications.map(c => c.locationId) } };
        }
      }
    }

    const locations = await this.prisma.location.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { certifications: true }
        }
      }
    });

    return locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      timezone: loc.timezone,
      staffCount: loc._count.certifications,
    }));
  }
}

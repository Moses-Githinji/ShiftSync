import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async getLocations() {
    const locations = await this.prisma.location.findMany({
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

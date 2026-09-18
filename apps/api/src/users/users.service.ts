import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

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

  async createUser(data: any) {
    const passwordHash = await bcrypt.hash('changeme123', 10);
    const names = data.name.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName,
        lastName,
        passwordHash,
        role: data.role,
      }
    });

    if (data.role === 'STAFF') {
      const location = await this.prisma.location.findFirst({ where: { name: data.location } });
      const staffProfile = await this.prisma.staffProfile.create({
        data: {
          userId: user.id,
          desiredHoursPerWeek: 40,
        }
      });
      if (location) {
        await this.prisma.staffLocationCertification.create({
          data: {
            staffProfileId: staffProfile.id,
            locationId: location.id,
          }
        });
      }
      if (data.skills && data.skills.length > 0) {
        await this.prisma.staffSkill.createMany({
          data: data.skills.map((skill: string) => ({
            staffProfileId: staffProfile.id,
            skill
          }))
        });
      }
    } else if (data.role === 'MANAGER' && data.location !== 'All Locations') {
      const location = await this.prisma.location.findFirst({ where: { name: data.location } });
      if (location) {
        await this.prisma.managerLocation.create({
          data: {
            userId: user.id,
            locationId: location.id
          }
        });
      }
    }

    await this.auditService.logAction({
      entityType: 'USER',
      entityId: user.id,
      action: 'USER_CREATED',
      reason: `User ${data.name} (${data.email}) created with role ${data.role}`,
    });

    return user;
  }
}


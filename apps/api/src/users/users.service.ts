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
      const locations = await this.prisma.location.findMany({ where: { name: { in: data.locations || [] } } });
      const staffProfile = await this.prisma.staffProfile.create({
        data: {
          userId: user.id,
          desiredHoursPerWeek: 40,
        }
      });
      if (locations.length > 0) {
        await this.prisma.staffLocationCertification.createMany({
          data: locations.map(loc => ({
            staffProfileId: staffProfile.id,
            locationId: loc.id,
          }))
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
    } else if (data.role === 'MANAGER' && !data.locations?.includes('All Locations')) {
      const locations = await this.prisma.location.findMany({ where: { name: { in: data.locations || [] } } });
      if (locations.length > 0) {
        await this.prisma.managerLocation.createMany({
          data: locations.map(loc => ({
            userId: user.id,
            locationId: loc.id
          }))
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

  async updateUser(id: string, data: any) {
    const names = data.name.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        firstName,
        lastName,
        role: data.role,
      }
    });

    if (data.role === 'STAFF') {
      const locations = await this.prisma.location.findMany({ where: { name: { in: data.locations || [] } } });
      
      const staffProfile = await this.prisma.staffProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          desiredHoursPerWeek: 40,
        }
      });

      if (locations.length > 0) {
        await this.prisma.staffLocationCertification.deleteMany({
          where: { staffProfileId: staffProfile.id }
        });
        await this.prisma.staffLocationCertification.createMany({
          data: locations.map(loc => ({
            staffProfileId: staffProfile.id,
            locationId: loc.id,
          }))
        });
      }

      await this.prisma.staffSkill.deleteMany({
        where: { staffProfileId: staffProfile.id }
      });
      if (data.skills && data.skills.length > 0) {
        await this.prisma.staffSkill.createMany({
          data: data.skills.map((skill: string) => ({
            staffProfileId: staffProfile.id,
            skill
          }))
        });
      }

      await this.prisma.managerLocation.deleteMany({
        where: { userId: user.id }
      });
    } else if (data.role === 'MANAGER') {
      await this.prisma.staffProfile.deleteMany({
        where: { userId: user.id }
      });
      await this.prisma.managerLocation.deleteMany({
        where: { userId: user.id }
      });

      if (!data.locations?.includes('All Locations')) {
        const locations = await this.prisma.location.findMany({ where: { name: { in: data.locations || [] } } });
        if (locations.length > 0) {
          await this.prisma.managerLocation.createMany({
            data: locations.map(loc => ({
              userId: user.id,
              locationId: loc.id
            }))
          });
        }
      }
    } else if (data.role === 'ADMIN') {
      await this.prisma.staffProfile.deleteMany({
        where: { userId: user.id }
      });
      await this.prisma.managerLocation.deleteMany({
        where: { userId: user.id }
      });
    }

    await this.auditService.logAction({
      entityType: 'USER',
      entityId: user.id,
      action: 'USER_UPDATED',
      reason: `User ${data.name} (${data.email}) updated`,
    });

    return user;
  }
}


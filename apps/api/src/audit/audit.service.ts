import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(entityType: string, entityId: string, action: string, actorId?: string, details?: any) {
    return this.prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        actorId,
        after: details ? details : {},
      }
    });
  }

  async getLogs(entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

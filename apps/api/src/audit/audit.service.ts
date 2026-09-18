import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async getAuditLogs() {
    const logs = await this.prisma.auditLog.findMany({
      include: {
        actor: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return logs.map(log => ({
      id: log.id,
      action: log.action,
      user: log.actor?.email || 'System',
      target: log.entityId, // we could join to get names but entityId is fine for demo
      date: log.createdAt,
      details: log.reason || ''
    }));
  }
}

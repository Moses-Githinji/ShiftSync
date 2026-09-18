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

  async logAction(params: {
    entityType: string;
    entityId: string;
    action: string;
    actorId?: string;
    before?: any;
    after?: any;
    reason?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          actorId: params.actorId || null,
          before: params.before || undefined,
          after: params.after || undefined,
          reason: params.reason || null,
        },
      });
    } catch (error) {
      // Audit logging should never break the main operation
      console.error('Failed to write audit log:', error);
    }
  }
}

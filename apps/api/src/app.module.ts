import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ShiftsModule } from './shifts/shifts.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SwapsModule } from './swaps/swaps.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ApprovalsModule } from './approvals/approvals.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ShiftsModule, AssignmentsModule, SwapsModule, NotificationsModule, AuditModule, DashboardModule, ApprovalsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

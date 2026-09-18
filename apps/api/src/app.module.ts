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
import { AvailabilityModule } from './availability/availability.module';
import { SkillsModule } from './skills/skills.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ShiftsModule,
    SwapsModule,
    ApprovalsModule,
    AssignmentsModule,
    AuditModule,
    DashboardModule,
    NotificationsModule,
    AvailabilityModule,
    SkillsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.user);
  }

  @Get('staff-hours')
  async getStaffHoursByDay(
    @Request() req: any,
    @Query('dayOfWeek') dayOfWeek: number
  ) {
    return this.dashboardService.getStaffHoursByDay(req.user.id, dayOfWeek);
  }

  @Get('staff')
  async getAllStaff(@Request() req: any) {
    return this.dashboardService.getAllStaffForLocation(req.user.id);
  }

  @Get('analytics')
  async getAnalytics(@Request() req: any) {
    return this.dashboardService.getAnalytics(req.user.id);
  }
}

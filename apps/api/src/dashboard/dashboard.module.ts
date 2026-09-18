import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [DashboardController, LocationsController],
  providers: [DashboardService, LocationsService],
})
export class DashboardModule {}

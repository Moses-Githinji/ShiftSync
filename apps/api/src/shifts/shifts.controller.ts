import { Controller, Get, Post, Patch, Param, Body, Query, BadRequestException, Req, UseGuards } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('staff')
  getStaff(@Query('locationId') locationId: string, @Req() req: any) {
    if (!locationId) throw new BadRequestException('locationId is required');
    return this.shiftsService.getStaffForLocation(locationId, req.user);
  }

  @Get('all')
  getAllShifts() {
    return this.shiftsService.getAllShifts();
  }

  @Get()
  getShifts(@Query('locationId') locationId: string, @Req() req: any, @Query('weekStart') weekStart?: string) {
    if (!locationId) throw new BadRequestException('locationId is required');
    return this.shiftsService.getShifts(locationId, weekStart, req.user);
  }

  @Post()
  createShift(@Req() req: any, @Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.createShift(createShiftDto, req.user);
  }

  @Patch(':id/assign')
  assignShift(@Req() req: any, @Param('id') id: string, @Body() body: { staffProfileId: string | null; date?: string; overrideReason?: string }) {
    return this.shiftsService.assignShift(id, body.staffProfileId, body.date, req.user, body.overrideReason);
  }

  @Patch('publish')
  publishSchedule(@Req() req: any, @Body() body: { locationId: string }) {
    return this.shiftsService.publishSchedule(body.locationId, req.user);
  }

  @Patch('unpublish')
  unpublishSchedule(@Req() req: any, @Body() body: { locationId: string }) {
    return this.shiftsService.unpublishSchedule(body.locationId, req.user);
  }
}

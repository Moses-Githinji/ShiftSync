import { Controller, Get, Post, Patch, Param, Body, Query, BadRequestException, Req } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('staff')
  getStaff(@Query('locationId') locationId: string) {
    if (!locationId) throw new BadRequestException('locationId is required');
    return this.shiftsService.getStaffForLocation(locationId);
  }

  @Get('all')
  getAllShifts() {
    return this.shiftsService.getAllShifts();
  }

  @Get()
  getShifts(@Query('locationId') locationId: string, @Query('weekStart') weekStart?: string) {
    if (!locationId) throw new BadRequestException('locationId is required');
    return this.shiftsService.getShifts(locationId, weekStart);
  }

  @Post()
  createShift(@Req() req: any, @Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.createShift(createShiftDto, req.user?.id);
  }

  @Patch(':id/assign')
  assignShift(@Req() req: any, @Param('id') id: string, @Body() body: { staffProfileId: string | null; date?: string }) {
    return this.shiftsService.assignShift(id, body.staffProfileId, body.date, req.user?.id);
  }

  @Patch('publish')
  publishSchedule(@Req() req: any, @Body() body: { locationId: string }) {
    return this.shiftsService.publishSchedule(body.locationId, req.user?.id);
  }
}

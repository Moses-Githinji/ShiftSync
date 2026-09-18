import { Controller, Get, Post, Patch, Param, Body, Query, BadRequestException } from '@nestjs/common';
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

  @Get()
  getShifts(@Query('locationId') locationId: string, @Query('weekStart') weekStart?: string) {
    if (!locationId) throw new BadRequestException('locationId is required');
    return this.shiftsService.getShifts(locationId, weekStart);
  }

  @Post()
  createShift(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.createShift(createShiftDto);
  }

  @Patch(':id/assign')
  assignShift(@Param('id') id: string, @Body() body: { staffProfileId: string | null; date?: string }) {
    return this.shiftsService.assignShift(id, body.staffProfileId, body.date);
  }

  @Patch('publish')
  publishSchedule(@Body() body: { locationId: string }) {
    return this.shiftsService.publishSchedule(body.locationId);
  }
}

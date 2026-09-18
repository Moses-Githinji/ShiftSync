import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  getAvailability(@Request() req: any) {
    return this.availabilityService.getAvailability(req.user.id);
  }

  @Post('windows')
  setWindows(@Request() req: any, @Body() body: { windows: any[] }) {
    return this.availabilityService.setWindows(req.user.id, body.windows || []);
  }

  @Post('exceptions')
  addException(@Request() req: any, @Body() body: any) {
    return this.availabilityService.addException(req.user.id, body);
  }

  @Delete('exceptions/:id')
  deleteException(@Request() req: any, @Param('id') id: string) {
    return this.availabilityService.deleteException(req.user.id, id);
  }
}
// trigger IDE refresh

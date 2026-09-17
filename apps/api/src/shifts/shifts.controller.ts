import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Patch(':id/publish')
  @Roles(Role.ADMIN, Role.MANAGER)
  publish(@Param('id') id: string) {
    return this.shiftsService.publish(id);
  }

  @Get()
  findAll(@Query('locationId') locationId?: string) {
    return this.shiftsService.findAll(locationId);
  }
}

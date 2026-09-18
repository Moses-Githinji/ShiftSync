import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  async getApprovals(
    @Request() req: any,
    @Query('status') status?: RequestStatus
  ) {
    return this.approvalsService.getApprovals(req.user.id, status);
  }

  @Patch('swaps/:id/approve')
  async approveSwap(@Request() req: any, @Param('id') id: string) {
    return this.approvalsService.approveSwapRequest(id, req.user.id);
  }

  @Patch('swaps/:id/deny')
  async denySwap(@Request() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.approvalsService.denySwapRequest(id, req.user.id, body.reason);
  }

  @Patch('drops/:id/approve')
  async approveDrop(@Request() req: any, @Param('id') id: string) {
    return this.approvalsService.approveDropRequest(id, req.user.id);
  }

  @Patch('drops/:id/deny')
  async denyDrop(@Request() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.approvalsService.denyDropRequest(id, req.user.id, body.reason);
  }
}
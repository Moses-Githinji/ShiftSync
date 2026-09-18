import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { SwapsService } from './swaps.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  @Post('swaps/request')
  requestSwap(@Request() req: any, @Body() body: { shiftId: string; toStaffId: string }) {
    return this.swapsService.requestSwap(req.user.id, body.shiftId, body.toStaffId);
  }

  @Patch('swaps/:id/accept')
  acceptSwap(@Request() req: any, @Param('id') id: string) {
    return this.swapsService.acceptSwap(req.user.id, id);
  }

  @Patch('swaps/:id/decline')
  declineSwap(@Request() req: any, @Param('id') id: string) {
    return this.swapsService.declineSwap(req.user.id, id);
  }

  @Get('swaps/incoming')
  getIncomingSwaps(@Request() req: any) {
    return this.swapsService.getIncomingSwaps(req.user.id);
  }

  @Post('drops/request')
  requestDrop(@Request() req: any, @Body() body: { shiftId: string }) {
    return this.swapsService.requestDrop(req.user.id, body.shiftId);
  }

  @Get('drops/available')
  getAvailableDrops(@Request() req: any) {
    return this.swapsService.getAvailableDrops(req.user.id);
  }

  @Post('drops/:id/claim')
  claimDrop(@Request() req: any, @Param('id') id: string) {
    return this.swapsService.claimDrop(req.user.id, id);
  }
}


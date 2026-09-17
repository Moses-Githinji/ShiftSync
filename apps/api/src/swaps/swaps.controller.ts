import { Controller, Post, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { SwapsService } from './swaps.service';
import { ProposeSwapDto } from './dto/propose-swap.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('swaps')
@UseGuards(JwtAuthGuard)
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  @Post()
  propose(@Body() proposeSwapDto: ProposeSwapDto, @Request() req: any) {
    return this.swapsService.propose(proposeSwapDto, req.user.id);
  }

  @Patch(':id/respond')
  respond(@Param('id') id: string, @Body('accept') accept: boolean, @Request() req: any) {
    return this.swapsService.respond(id, req.user.id, accept);
  }
}

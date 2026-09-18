import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  getSkills() {
    return this.skillsService.getSkills();
  }

  @Post()
  createSkill(@Body() body: { name: string }) {
    return this.skillsService.createSkill(body.name);
  }
}

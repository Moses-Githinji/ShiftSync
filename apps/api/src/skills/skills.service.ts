import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  async getSkills() {
    return this.prisma.skill.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async createSkill(name: string) {
    if (!name || name.trim() === '') {
      throw new BadRequestException('Skill name is required');
    }

    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '_');
    
    try {
      const existing = await this.prisma.skill.findUnique({
        where: { name: normalizedName }
      });

      if (existing) {
        return existing;
      }

      return await this.prisma.skill.create({
        data: { name: normalizedName }
      });
    } catch (error) {
      throw new BadRequestException('Failed to create skill');
    }
  }
}

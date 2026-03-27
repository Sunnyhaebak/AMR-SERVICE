import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBotDto } from './dto/create-bot.dto';

@Injectable()
export class BotsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBotDto) {
    return this.prisma.bot.create({ data: dto });
  }

  async findAll(siteId?: string) {
    return this.prisma.bot.findMany({
      where: {
        ...(siteId && { siteId }),
        isActive: true,
      },
      include: { site: { select: { id: true, name: true, customerName: true } } },
      orderBy: { botNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const bot = await this.prisma.bot.findUnique({
      where: { id },
      include: { site: true },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    return bot;
  }

  async update(id: string, dto: Partial<CreateBotDto>) {
    await this.findOne(id);
    return this.prisma.bot.update({ where: { id }, data: dto });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSiteDto) {
    return this.prisma.site.create({ data: dto });
  }

  async findAll() {
    return this.prisma.site.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const site = await this.prisma.site.findUnique({ where: { id } });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async update(id: string, dto: Partial<CreateSiteDto>) {
    await this.findOne(id);
    return this.prisma.site.update({ where: { id }, data: dto });
  }
}

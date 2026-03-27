import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BotsService } from './bots.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Bots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bots')
export class BotsController {
  constructor(private botsService: BotsService) {}

  @Post()
  create(@Body() dto: CreateBotDto) {
    return this.botsService.create(dto);
  }

  @Get()
  findAll(@Query('site_id') siteId?: string) {
    return this.botsService.findAll(siteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.botsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateBotDto>) {
    return this.botsService.update(id, dto);
  }
}

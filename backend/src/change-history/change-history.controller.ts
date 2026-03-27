import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChangeHistoryService } from './change-history.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ChangeType, ServiceType, ChangeHistoryStatus } from '@prisma/client';

@ApiTags('Change History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
@Controller('change-history')
export class ChangeHistoryController {
  constructor(private changeHistoryService: ChangeHistoryService) {}

  @Get('bot')
  findByBot(
    @Query('bot_id') botId: string,
    @Query('change_type') changeType?: ChangeType,
    @Query('service_type') serviceType?: ServiceType,
    @Query('status') status?: ChangeHistoryStatus,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('engineer_id') engineerId?: string,
  ) {
    return this.changeHistoryService.findByBot(botId, {
      changeType, serviceType, status, startDate, endDate, engineerId,
    });
  }

  @Get('customer')
  findByCustomer(
    @Query('site_ids') siteIds: string,
    @Query('change_type') changeType?: ChangeType,
    @Query('service_type') serviceType?: ServiceType,
    @Query('status') status?: ChangeHistoryStatus,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('engineer_id') engineerId?: string,
  ) {
    const ids = siteIds.split(',').map((s) => s.trim());
    return this.changeHistoryService.findByCustomer(ids, {
      changeType, serviceType, status, startDate, endDate, engineerId,
    });
  }
}

import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SmrService } from './smr.service';
import { CreateSmrDto } from './dto/create-smr.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/jwt-payload.interface';
import { SmrState } from '@prisma/client';

@ApiTags('SMR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('smr')
export class SmrController {
  constructor(private smrService: SmrService) {}

  @Post()
  create(@Body() dto: CreateSmrDto, @CurrentUser() user: AuthenticatedUser) {
    return this.smrService.create(dto, user.id, user.id);
  }

  @Get()
  findAll(
    @Query('state') state?: SmrState,
    @Query('manager_id') managerId?: string,
    @Query('engineer_id') engineerId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.smrService.findAll({ state, managerId, engineerId, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.smrService.findOne(id);
  }

  @Roles('MANAGER')
  @Put(':id/assign')
  assign(
    @Param('id') id: string,
    @Body('engineerId') engineerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.smrService.assignToEngineer(id, engineerId, user.id);
  }

  @Roles('ENGINEER')
  @Put(':id/approve-engineer')
  engineerApprove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.smrService.engineerApprove(id, user.id);
  }

  @Roles('MANAGER')
  @Put(':id/approve-manager')
  managerApprove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.smrService.managerApprove(id, user.id);
  }

  @Put(':id/reject')
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.smrService.reject(id, reason, user.id);
  }
}

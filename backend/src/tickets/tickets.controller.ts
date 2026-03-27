import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CompleteTicketDto } from './dto/complete-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/jwt-payload.interface';
import { TicketState } from '@prisma/client';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Roles('MANAGER')
  @Post()
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.create(dto, user.id);
  }

  @Get()
  findAll(
    @Query('state') state?: TicketState,
    @Query('manager_id') managerId?: string,
    @Query('engineer_id') engineerId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.ticketsService.findAll({ state, managerId, engineerId, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Roles('MANAGER')
  @Put(':id/assign')
  assign(
    @Param('id') id: string,
    @Body('engineerId') engineerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.assign(id, engineerId, user.id);
  }

  @Roles('ENGINEER')
  @Put(':id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.accept(id, user.id);
  }

  @Roles('ENGINEER')
  @Put(':id/reject')
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.reject(id, user.id, reason);
  }

  @Roles('ENGINEER')
  @Put(':id/re-accept')
  reAccept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.reAccept(id, user.id);
  }

  @Roles('ENGINEER')
  @Put(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.complete(id, user.id, dto);
  }

  @Roles('ENGINEER')
  @Get('engineer/rejected')
  getRejectedTickets(@CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.getEngineerRejectedTickets(user.id);
  }
}

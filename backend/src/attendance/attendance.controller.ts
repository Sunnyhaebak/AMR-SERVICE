import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto } from './dto/checkin.dto';
import { MarkAttendanceDto, BulkMarkAttendanceDto } from './dto/mark-attendance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Roles('ENGINEER')
  @Post('checkin')
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.checkIn(user.id, dto);
  }

  @Roles('ENGINEER')
  @Post('checkout')
  checkOut(@Body() dto: CheckOutDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.checkOut(user.id, dto);
  }

  @Roles('MANAGER')
  @Put('mark')
  markAttendance(
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.markAttendance(dto, user.id);
  }

  @Roles('MANAGER')
  @Post('bulk')
  bulkMark(
    @Body() dto: BulkMarkAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.bulkMarkAttendance(dto.records, user.id);
  }

  @Get()
  getAttendance(
    @Query('engineer_id') engineerId?: string,
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.attendanceService.getAttendance({
      engineerId,
      managerId: user?.roles.includes('MANAGER') ? user.id : undefined,
      month: month ?? new Date().getMonth() + 1,
      year: year ?? new Date().getFullYear(),
    });
  }

  @Roles('MANAGER')
  @Put(':id/resolve')
  resolveOverride(
    @Param('id') id: string,
    @Body('state') state: 'PRESENT' | 'ABSENT',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.resolveOverride(id, state, user.id);
  }

  @Get('analytics')
  getAnalytics(
    @Query('mode') mode: 'day' | 'month' = 'day',
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('engineer_id') engineerId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.attendanceService.getAnalytics({
      managerId: user?.roles.includes('MANAGER') ? user?.id : undefined,
      engineerId: engineerId ?? (user?.roles.includes('ENGINEER') ? user?.id : undefined),
      mode,
      month,
      year: year ?? new Date().getFullYear(),
    });
  }
}

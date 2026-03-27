import {
  Injectable, ConflictException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isWithinGeofence } from '../common/utils/haversine';
import { parseDate, todayUTC, utcDate } from '../common/utils/date';
import { CheckInDto, CheckOutDto } from './dto/checkin.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { AttendanceState } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async checkIn(engineerId: string, dto: CheckInDto) {
    const today = todayUTC();

    // Check if already checked in today
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { engineerId_attendanceDate: { engineerId, attendanceDate: today } },
    });

    if (existing?.checkInTime) {
      throw new ConflictException('You have already checked in today');
    }

    // Validate geofence
    const site = await this.prisma.site.findUnique({ where: { id: dto.siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const withinFence = isWithinGeofence(
      dto.lat, dto.lng, site.latitude, site.longitude, site.radiusMeters,
    );

    const state: AttendanceState = withinFence ? 'PRESENT' : 'OVERRIDE_PENDING';
    const now = new Date();

    const record = existing
      ? await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            siteId: dto.siteId,
            state,
            checkInTime: now,
            checkInLat: dto.lat,
            checkInLng: dto.lng,
            source: 'ENGINEER_CHECKIN',
            version: { increment: 1 },
          },
        })
      : await this.prisma.attendanceRecord.create({
          data: {
            engineerId,
            siteId: dto.siteId,
            attendanceDate: today,
            state,
            checkInTime: now,
            checkInLat: dto.lat,
            checkInLng: dto.lng,
            source: 'ENGINEER_CHECKIN',
          },
        });

    await this.audit.log({
      userId: engineerId,
      action: 'CHECK_IN',
      entityType: 'AttendanceRecord',
      entityId: record.id,
      newState: state,
      metadata: { withinGeofence: withinFence, lat: dto.lat, lng: dto.lng },
    });

    return {
      ...record,
      withinGeofence: withinFence,
      message: withinFence
        ? 'Checked in successfully'
        : 'You appear to be outside the expected location. Your attendance has been submitted for manager review.',
    };
  }

  async checkOut(engineerId: string, dto: CheckOutDto) {
    const today = todayUTC();

    const record = await this.prisma.attendanceRecord.findUnique({
      where: { engineerId_attendanceDate: { engineerId, attendanceDate: today } },
    });

    if (!record || !record.checkInTime) {
      throw new BadRequestException('You have not checked in today');
    }
    if (record.checkOutTime) {
      throw new ConflictException('You have already checked out today');
    }

    const now = new Date();
    const updated = await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOutTime: now,
        checkOutLat: dto.lat,
        checkOutLng: dto.lng,
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      userId: engineerId,
      action: 'CHECK_OUT',
      entityType: 'AttendanceRecord',
      entityId: record.id,
      metadata: { lat: dto.lat, lng: dto.lng },
    });

    return updated;
  }

  async markAttendance(dto: MarkAttendanceDto, managerId: string) {
    const date = parseDate(dto.date);

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        engineerId_attendanceDate: {
          engineerId: dto.engineerId,
          attendanceDate: date,
        },
      },
    });

    const state = dto.state ?? AttendanceState.PLANNED;

    if (existing) {
      const updated = await this.prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          siteId: dto.siteId,
          state,
          source: 'MANAGER_MARKED',
          version: { increment: 1 },
        },
      });

      await this.audit.log({
        userId: managerId,
        action: 'MARK_ATTENDANCE',
        entityType: 'AttendanceRecord',
        entityId: updated.id,
        oldState: existing.state,
        newState: state,
      });

      return updated;
    }

    const record = await this.prisma.attendanceRecord.create({
      data: {
        engineerId: dto.engineerId,
        siteId: dto.siteId,
        attendanceDate: date,
        state,
        source: 'MANAGER_MARKED',
      },
    });

    await this.audit.log({
      userId: managerId,
      action: 'MARK_ATTENDANCE',
      entityType: 'AttendanceRecord',
      entityId: record.id,
      newState: state,
    });

    return record;
  }

  async bulkMarkAttendance(records: MarkAttendanceDto[], managerId: string) {
    const results = [];
    for (const dto of records) {
      results.push(await this.markAttendance(dto, managerId));
    }
    return results;
  }

  async getAttendance(params: {
    engineerId?: string;
    managerId?: string;
    month: number;
    year: number;
  }) {
    const startDate = utcDate(params.year, params.month, 1);
    const lastDay = new Date(params.year, params.month, 0).getDate();
    const endDate = utcDate(params.year, params.month, lastDay);

    const where: any = {
      attendanceDate: { gte: startDate, lte: endDate },
    };

    if (params.engineerId) {
      where.engineerId = params.engineerId;
    }

    if (params.managerId) {
      where.engineer = { managerId: params.managerId };
    }

    return this.prisma.attendanceRecord.findMany({
      where,
      include: {
        engineer: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: { attendanceDate: 'asc' },
    });
  }

  async resolveOverride(
    recordId: string,
    state: 'PRESENT' | 'ABSENT',
    managerId: string,
  ) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new NotFoundException('Attendance record not found');
    if (record.state !== 'OVERRIDE_PENDING') {
      throw new BadRequestException('Record is not in OVERRIDE_PENDING state');
    }

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: { state, version: { increment: 1 } },
    });

    await this.audit.log({
      userId: managerId,
      action: 'RESOLVE_OVERRIDE',
      entityType: 'AttendanceRecord',
      entityId: recordId,
      oldState: 'OVERRIDE_PENDING',
      newState: state,
    });

    return updated;
  }

  async getAnalytics(params: {
    managerId?: string;
    engineerId?: string;
    mode: 'day' | 'month';
    month?: number;
    year: number;
  }) {
    const where: any = {};

    if (params.engineerId) {
      where.engineerId = params.engineerId;
    } else if (params.managerId) {
      where.engineer = { managerId: params.managerId };
    }

    if (params.mode === 'day' && params.month) {
      const start = utcDate(params.year, params.month, 1);
      const lastDay = new Date(params.year, params.month, 0).getDate();
      const end = utcDate(params.year, params.month, lastDay);
      where.attendanceDate = { gte: start, lte: end };
    } else {
      const start = utcDate(params.year, 1, 1);
      const end = utcDate(params.year, 12, 31);
      where.attendanceDate = { gte: start, lte: end };
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        engineer: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: { attendanceDate: 'asc' },
    });

    return records;
  }
}

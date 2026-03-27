import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TicketsModule } from './tickets/tickets.module';
import { SmrModule } from './smr/smr.module';
import { SitesModule } from './sites/sites.module';
import { BotsModule } from './bots/bots.module';
import { ChangeHistoryModule } from './change-history/change-history.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    AttendanceModule,
    TicketsModule,
    SmrModule,
    SitesModule,
    BotsModule,
    ChangeHistoryModule,
    AuditModule,
  ],
})
export class AppModule {}

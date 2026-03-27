import { IsUUID, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceState } from '@prisma/client';

export class MarkAttendanceDto {
  @ApiProperty()
  @IsUUID()
  engineerId!: string;

  @ApiProperty()
  @IsUUID()
  siteId!: string;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ enum: AttendanceState })
  @IsOptional()
  @IsEnum(AttendanceState)
  state?: AttendanceState;
}

export class BulkMarkAttendanceDto {
  @ApiProperty({ type: [MarkAttendanceDto] })
  records!: MarkAttendanceDto[];
}

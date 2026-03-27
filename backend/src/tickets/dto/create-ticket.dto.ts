import {
  IsString, IsUUID, IsOptional, IsEnum, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType, ChangeType } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  customerName!: string;

  @ApiProperty()
  @IsString()
  customerLocation!: string;

  @ApiProperty()
  @IsUUID()
  siteId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  botNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zendeskTicketId?: string;

  @ApiProperty({ enum: ServiceType })
  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @ApiProperty({ enum: ChangeType })
  @IsEnum(ChangeType)
  changeType!: ChangeType;

  @ApiProperty()
  @IsString()
  changeSubtype!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedEngineerId?: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

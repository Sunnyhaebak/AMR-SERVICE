import {
  IsString, IsUUID, IsOptional, IsArray, IsEnum, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SmrSource } from '@prisma/client';

export class SmrItemDto {
  @ApiProperty()
  @IsString()
  itemName!: string;

  @ApiProperty()
  @IsString()
  partNumber!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  @IsString()
  unit!: string;
}

export class CreateSmrDto {
  @ApiProperty()
  @IsString()
  customerName!: string;

  @ApiProperty()
  @IsUUID()
  siteId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiProperty({ type: [SmrItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SmrItemDto)
  items!: SmrItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedEngineerId?: string;

  @ApiPropertyOptional({ enum: SmrSource })
  @IsOptional()
  @IsEnum(SmrSource)
  source?: SmrSource;
}

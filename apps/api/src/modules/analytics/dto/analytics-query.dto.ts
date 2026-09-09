import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strategyId?: string;
}

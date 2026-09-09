import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AppPreferencesJson } from '@journalx/domain';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'Expected aggregate version for optimistic concurrency' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;

  @ApiPropertyOptional({ example: 'Asia/Kathmandu' })
  @IsOptional()
  @IsString()
  journalTimezone?: string;

  @ApiPropertyOptional({ example: 'Asia/Kathmandu' })
  @IsOptional()
  @IsString()
  displayTimezone?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsOptional()
  @IsString()
  defaultAccountId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  preferencesJson?: AppPreferencesJson;
}

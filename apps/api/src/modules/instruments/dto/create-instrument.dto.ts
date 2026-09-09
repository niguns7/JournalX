import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInstrumentDto {
  @ApiProperty({ example: 'MGC' })
  @IsNotEmpty()
  @IsString()
  symbol!: string;

  @ApiProperty({ example: 'Micro Gold Futures' })
  @IsNotEmpty()
  @IsString()
  displayName!: string;

  @ApiProperty({ example: '0.100000' })
  @IsNotEmpty()
  @IsString()
  tickSize!: string;

  @ApiProperty({ example: '10.000000' })
  @IsNotEmpty()
  @IsString()
  pointValue!: string;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiPropertyOptional({ example: 'CME Group MGC Contract Specifications' })
  @IsOptional()
  @IsString()
  verifiedSource?: string;

  @ApiPropertyOptional({ example: '2026-09-08T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  verifiedAt?: string;
}

export class UpdateInstrumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tickSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pointValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  verifiedSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  verifiedAt?: string;
}

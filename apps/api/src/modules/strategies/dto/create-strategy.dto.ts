import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StrategyChecklistJson, StrategyRulesJson } from '@journalx/domain';

export class CreateStrategyDto {
  @ApiProperty({ example: 'MGC Top-Down Sweep Confirmation v1' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: {
      maxContracts: 5,
      maxStructuralStopPoints: '5.000000',
      minPlannedRR: '2.000000',
      consecutiveLossStopCount: 2,
      maxRiskPerTradeDollars: '250.00',
    },
  })
  @IsNotEmpty()
  rules!: StrategyRulesJson;

  @ApiProperty({
    example: {
      items: [
        {
          key: 'htf_context',
          label: 'Higher-timeframe context',
          isMandatory: true,
          order: 1,
        },
      ],
    },
  })
  @IsNotEmpty()
  checklist!: StrategyChecklistJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narrative?: string;

  @ApiPropertyOptional({ default: false, description: 'Immediately publish initial version' })
  @IsOptional()
  publishImmediately?: boolean = false;
}

export class UpdateStrategyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateStrategyVersionDto {
  @ApiProperty({
    example: {
      maxContracts: 5,
      maxStructuralStopPoints: '5.000000',
      minPlannedRR: '2.000000',
      consecutiveLossStopCount: 2,
      maxRiskPerTradeDollars: '250.00',
    },
  })
  @IsNotEmpty()
  rules!: StrategyRulesJson;

  @ApiProperty({
    example: {
      items: [
        {
          key: 'htf_context',
          label: 'Higher-timeframe context',
          isMandatory: true,
          order: 1,
        },
      ],
    },
  })
  @IsNotEmpty()
  checklist!: StrategyChecklistJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narrative?: string;
}

export class UpdateStrategyVersionDto {
  @ApiPropertyOptional()
  @IsOptional()
  rules?: StrategyRulesJson;

  @ApiPropertyOptional()
  @IsOptional()
  checklist?: StrategyChecklistJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narrative?: string;
}

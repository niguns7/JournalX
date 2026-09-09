import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  DailyGrade,
  ImpactLevel,
  JournalStatus,
  QuarterId,
  QuarterModel,
  ScenarioKind,
  Timeframe,
  ZoneKind,
} from '@journalx/domain';
import {
  MarketConfluenceJson,
  ProcessJson,
  QuarterConfigJson,
  ReadinessJson,
  ReflectionJson,
  ScenarioConditionsJson,
  TimeframeDataJson,
} from '@journalx/domain';

export class CreateJournalDto {
  @ApiProperty({ example: '2026-09-09', description: 'Journal calendar date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  journalDate!: string;

  @ApiPropertyOptional({ example: 'Asia/Kathmandu' })
  @IsOptional()
  @IsString()
  timezoneSnapshot?: string;
}

export class UpdateJournalDto {
  @ApiPropertyOptional({ description: 'Expected version for optimistic concurrency' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  sleepQuality?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  focusRating?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  stressRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emotionalState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preparationNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  readiness?: ReadinessJson;

  @ApiPropertyOptional()
  @IsOptional()
  processEvaluation?: ProcessJson;

  @ApiPropertyOptional()
  @IsOptional()
  reflection?: ReflectionJson;

  @ApiPropertyOptional({ enum: DailyGrade })
  @IsOptional()
  @IsEnum(DailyGrade)
  gradeOverride?: DailyGrade;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gradeOverrideReason?: string;
}

export class CompleteJournalReviewDto {
  @ApiPropertyOptional({ description: 'Expected aggregate version' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;

  @ApiPropertyOptional({ description: 'Is this a disciplined no-trade day?' })
  @IsOptional()
  isNoTradeDay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  reflection?: ReflectionJson;

  @ApiPropertyOptional()
  @IsOptional()
  processEvaluation?: ProcessJson;

  @ApiPropertyOptional({ enum: DailyGrade })
  @IsOptional()
  @IsEnum(DailyGrade)
  gradeOverride?: DailyGrade;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gradeOverrideReason?: string;
}

export class ReopenJournalDto {
  @ApiProperty({ example: 'Need to record an omitted late London execution' })
  @IsNotEmpty()
  @IsString()
  reason!: string;
}

export class CreateWindowDto {
  @ApiProperty({ example: 'London Silver Bullet' })
  @IsNotEmpty()
  @IsString()
  label!: string;

  @ApiProperty({ example: 'Europe/London' })
  @IsNotEmpty()
  @IsString()
  timezone!: string;

  @ApiProperty({ example: '2026-09-09T07:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: '2026-09-09T10:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  quarterConfig?: QuarterConfigJson;
}

export class UpdateWindowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  quarterConfig?: QuarterConfigJson;
}

export class CreateEconomicEventDto {
  @ApiProperty({ example: 'US CPI Release' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({ example: '2026-09-09T12:30:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  occursAt!: string;

  @ApiPropertyOptional({ enum: ImpactLevel, default: ImpactLevel.LOW })
  @IsOptional()
  @IsEnum(ImpactLevel)
  impact?: ImpactLevel = ImpactLevel.LOW;

  @ApiPropertyOptional({ example: '2026-09-09T12:25:00.000Z' })
  @IsOptional()
  @IsDateString()
  restrictionStart?: string;

  @ApiPropertyOptional({ example: '2026-09-09T12:35:00.000Z' })
  @IsOptional()
  @IsDateString()
  restrictionEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkedAt?: string;
}

export class UpdateEconomicEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occursAt?: string;

  @ApiPropertyOptional({ enum: ImpactLevel })
  @IsOptional()
  @IsEnum(ImpactLevel)
  impact?: ImpactLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  restrictionStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  restrictionEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkedAt?: string;
}

export class CreateTimeframeAnalysisDto {
  @ApiPropertyOptional({ example: 'window-uuid' })
  @IsOptional()
  @IsString()
  windowId?: string | null;

  @ApiProperty({ enum: Timeframe, example: Timeframe.TF_4H })
  @IsNotEmpty()
  @IsEnum(Timeframe)
  timeframe!: Timeframe;

  @ApiPropertyOptional()
  @IsOptional()
  data?: TimeframeDataJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narrative?: string;
}

export class UpdateTimeframeAnalysisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  windowId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  data?: TimeframeDataJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narrative?: string;
}

export class CreateMarketZoneDto {
  @ApiProperty({ enum: ZoneKind, example: ZoneKind.SUPPLY })
  @IsNotEmpty()
  @IsEnum(ZoneKind)
  kind!: ZoneKind;

  @ApiProperty({ example: '4430.000000' })
  @IsNotEmpty()
  @IsString()
  lowerPrice!: string;

  @ApiProperty({ example: '4435.000000' })
  @IsNotEmpty()
  @IsString()
  upperPrice!: string;

  @ApiPropertyOptional()
  @IsOptional()
  confluence?: MarketConfluenceJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMarketZoneDto {
  @ApiPropertyOptional({ enum: ZoneKind })
  @IsOptional()
  @IsEnum(ZoneKind)
  kind?: ZoneKind;

  @ApiPropertyOptional({ example: '4430.000000' })
  @IsOptional()
  @IsString()
  lowerPrice?: string;

  @ApiPropertyOptional({ example: '4435.000000' })
  @IsOptional()
  @IsString()
  upperPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  confluence?: MarketConfluenceJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateScenarioDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  windowId?: string | null;

  @ApiProperty({ enum: ScenarioKind, example: ScenarioKind.SHORT })
  @IsNotEmpty()
  @IsEnum(ScenarioKind)
  kind!: ScenarioKind;

  @ApiPropertyOptional()
  @IsOptional()
  conditions?: ScenarioConditionsJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narrative?: string;
}

export class UpdateScenarioDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  windowId?: string | null;

  @ApiPropertyOptional({ enum: ScenarioKind })
  @IsOptional()
  @IsEnum(ScenarioKind)
  kind?: ScenarioKind;

  @ApiPropertyOptional()
  @IsOptional()
  conditions?: ScenarioConditionsJson;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narrative?: string;
}

export class CreateQuarterObservationDto {
  @ApiProperty({ enum: QuarterId, example: QuarterId.Q1 })
  @IsNotEmpty()
  @IsEnum(QuarterId)
  quarter!: QuarterId;

  @ApiProperty({ example: '2026-09-09T07:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: '2026-09-09T07:45:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({ example: '4440.000000' })
  @IsOptional()
  @IsString()
  rangeHigh?: string;

  @ApiPropertyOptional({ example: '4430.000000' })
  @IsOptional()
  @IsString()
  rangeLow?: string;

  @ApiPropertyOptional({ example: '4433.000000' })
  @IsOptional()
  @IsString()
  trueOpenPrice?: string;

  @ApiPropertyOptional({ enum: QuarterModel, default: QuarterModel.UNKNOWN })
  @IsOptional()
  @IsEnum(QuarterModel)
  model?: QuarterModel = QuarterModel.UNKNOWN;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateQuarterObservationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ example: '4440.000000' })
  @IsOptional()
  @IsString()
  rangeHigh?: string;

  @ApiPropertyOptional({ example: '4430.000000' })
  @IsOptional()
  @IsString()
  rangeLow?: string;

  @ApiPropertyOptional({ example: '4433.000000' })
  @IsOptional()
  @IsString()
  trueOpenPrice?: string;

  @ApiPropertyOptional({ enum: QuarterModel })
  @IsOptional()
  @IsEnum(QuarterModel)
  model?: QuarterModel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateJournalAccountLimitDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTrades?: number;

  @ApiPropertyOptional({ example: '500.00' })
  @IsOptional()
  @IsString()
  maxDailyLoss?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  consecutiveLossLimit?: number;
}

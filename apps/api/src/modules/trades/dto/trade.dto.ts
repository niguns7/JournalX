import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ChecklistAnswer,
  ManagementEventKind,
  RecordingMode,
  TradeDirection,
  TradeOutcome,
  TradeState,
  ViolationSeverity,
  ViolationSource,
} from '@journalx/domain';
import { TradeReviewJson, TradeSnapshotJson } from '@journalx/domain';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class ChecklistAnswerItemDto {
  @ApiProperty({ example: 'htf_context' })
  @IsNotEmpty()
  @IsString()
  itemKey!: string;

  @ApiProperty({ enum: ChecklistAnswer, example: ChecklistAnswer.PASS })
  @IsNotEmpty()
  @IsEnum(ChecklistAnswer)
  answer!: ChecklistAnswer;

  @ApiPropertyOptional({ example: '4H bullish FVG respected at 4430' })
  @IsOptional()
  @IsString()
  evidenceNote?: string;
}

export class CreateTradePlanDto {
  @ApiProperty({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsNotEmpty()
  @IsString()
  journalId!: string;

  @ApiProperty({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsNotEmpty()
  @IsString()
  accountId!: string;

  @ApiProperty({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsNotEmpty()
  @IsString()
  instrumentId!: string;

  @ApiProperty({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsNotEmpty()
  @IsString()
  strategyVersionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  windowId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scenarioId?: string | null;

  @ApiProperty({ enum: TradeDirection, example: TradeDirection.LONG })
  @IsNotEmpty()
  @IsEnum(TradeDirection)
  direction!: TradeDirection;

  @ApiPropertyOptional({ example: 'MGCZ26' })
  @IsOptional()
  @IsString()
  actualContractSymbol?: string;

  @ApiProperty({ example: '4435.000000' })
  @IsNotEmpty()
  @IsString()
  plannedEntry!: string;

  @ApiProperty({ example: '4430.000000' })
  @IsNotEmpty()
  @IsString()
  originalStop!: string;

  @ApiProperty({ example: '4445.000000' })
  @IsNotEmpty()
  @IsString()
  originalTarget!: string;

  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ type: [ChecklistAnswerItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistAnswerItemDto)
  checklistAnswers?: ChecklistAnswerItemDto[];
}

export class UpdateTradePlanDto {
  @ApiPropertyOptional({ description: 'Expected aggregate version' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;

  @ApiPropertyOptional({ example: '4435.000000' })
  @IsOptional()
  @IsString()
  plannedEntry?: string;

  @ApiPropertyOptional({ example: '4430.000000' })
  @IsOptional()
  @IsString()
  originalStop?: string;

  @ApiPropertyOptional({ example: '4445.000000' })
  @IsOptional()
  @IsString()
  originalTarget?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actualContractSymbol?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  windowId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scenarioId?: string | null;
}

export class OpenTradeDto {
  @ApiPropertyOptional({ description: 'Expected aggregate version' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;

  @ApiProperty({ example: '4435.000000' })
  @IsNotEmpty()
  @IsString()
  actualEntry!: string;

  @ApiProperty({ example: '2026-09-09T08:15:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  entryAt!: string;

  @ApiPropertyOptional({ example: 'MGCZ26' })
  @IsOptional()
  @IsString()
  actualContractSymbol?: string;

  @ApiPropertyOptional({ description: 'Acknowledge rule violations if opening non-compliant execution' })
  @IsOptional()
  @IsBoolean()
  acknowledgeViolations?: boolean;
}

export class RecordExecutionDto {
  @ApiProperty({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsNotEmpty()
  @IsString()
  journalId!: string;

  @ApiProperty({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsNotEmpty()
  @IsString()
  accountId!: string;

  @ApiProperty({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsNotEmpty()
  @IsString()
  instrumentId!: string;

  @ApiProperty({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsNotEmpty()
  @IsString()
  strategyVersionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  windowId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scenarioId?: string | null;

  @ApiProperty({ enum: TradeDirection, example: TradeDirection.LONG })
  @IsNotEmpty()
  @IsEnum(TradeDirection)
  direction!: TradeDirection;

  @ApiProperty({ example: '4435.000000' })
  @IsNotEmpty()
  @IsString()
  actualEntry!: string;

  @ApiProperty({ example: '4430.000000' })
  @IsNotEmpty()
  @IsString()
  originalStop!: string;

  @ApiProperty({ example: '4445.000000' })
  @IsNotEmpty()
  @IsString()
  originalTarget!: string;

  @ApiProperty({ example: 5 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: '2026-09-09T08:15:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  entryAt!: string;

  @ApiPropertyOptional({ example: 'MGCZ26' })
  @IsOptional()
  @IsString()
  actualContractSymbol?: string;

  // Optional close fields for atomic closed retrospective record
  @ApiPropertyOptional({ example: '4445.000000' })
  @IsOptional()
  @IsString()
  exitPrice?: string;

  @ApiPropertyOptional({ example: '2026-09-09T08:45:00.000Z' })
  @IsOptional()
  @IsDateString()
  exitAt?: string;

  @ApiPropertyOptional({ example: '12.50' })
  @IsOptional()
  @IsString()
  actualFees?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  feesConfirmed?: boolean = true;

  @ApiPropertyOptional({ type: [ChecklistAnswerItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistAnswerItemDto)
  checklistAnswers?: ChecklistAnswerItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acknowledgeViolations?: boolean;
}

export class CloseTradeDto {
  @ApiPropertyOptional({ description: 'Expected aggregate version' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;

  @ApiProperty({ example: '4445.000000' })
  @IsNotEmpty()
  @IsString()
  exitPrice!: string;

  @ApiProperty({ example: '2026-09-09T08:45:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  exitAt!: string;

  @ApiPropertyOptional({ example: '12.50' })
  @IsOptional()
  @IsString()
  actualFees?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  feesConfirmed?: boolean = true;

  @ApiPropertyOptional({ example: '1.200000' })
  @IsOptional()
  @IsString()
  observedAdversePoints?: string;

  @ApiPropertyOptional({ example: '10.500000' })
  @IsOptional()
  @IsString()
  observedFavorablePoints?: string;
}

export class AddManagementEventDto {
  @ApiProperty({ enum: ManagementEventKind, example: ManagementEventKind.STOP_LOSS_UPDATE })
  @IsNotEmpty()
  @IsEnum(ManagementEventKind)
  kind!: ManagementEventKind;

  @ApiProperty({ example: '4432.000000' })
  @IsNotEmpty()
  @IsString()
  newValue!: string;

  @ApiPropertyOptional({ example: 'Moved stop to breakeven after 1R reached' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SaveChecklistAnswersDto {
  @ApiProperty({ type: [ChecklistAnswerItemDto] })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistAnswerItemDto)
  answers!: ChecklistAnswerItemDto[];
}

export class ReviewTradeDto {
  @ApiPropertyOptional({ description: 'Expected aggregate version' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;

  @ApiProperty({
    example: {
      notes: 'Executed cleanly according to plan',
      followedPlan: true,
      entryExecutionRating: 10,
      managementRating: 9,
      exitRating: 10,
      emotionalDisciplineRating: 10,
      lessonsLearned: 'Patience at 15M POI paid off',
    },
  })
  @IsNotEmpty()
  review!: TradeReviewJson;
}

export class CorrectTradeDto {
  @ApiProperty({ description: 'Expected aggregate version for optimistic concurrency' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiProperty({ example: 'Broker fill statement showed actual exit at 4444.80 instead of 4445.00' })
  @IsNotEmpty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ example: '4435.000000' })
  @IsOptional()
  @IsString()
  actualEntry?: string;

  @ApiPropertyOptional({ example: '4430.000000' })
  @IsOptional()
  @IsString()
  originalStop?: string;

  @ApiPropertyOptional({ example: '4445.000000' })
  @IsOptional()
  @IsString()
  originalTarget?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: '4444.800000' })
  @IsOptional()
  @IsString()
  exitPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  exitAt?: string;

  @ApiPropertyOptional({ example: '12.50' })
  @IsOptional()
  @IsString()
  actualFees?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  feesConfirmed?: boolean;
}

export class VoidTradeDto {
  @ApiProperty({ description: 'Expected aggregate version' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiProperty({ example: 'Accidentally recorded duplicate trade entry' })
  @IsNotEmpty()
  @IsString()
  reason!: string;
}

export class TradeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  journalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: TradeState })
  @IsOptional()
  @IsEnum(TradeState)
  state?: TradeState;

  @ApiPropertyOptional({ enum: TradeOutcome })
  @IsOptional()
  @IsEnum(TradeOutcome)
  outcome?: TradeOutcome;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strategyId?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  includeVoided?: boolean = false;
}

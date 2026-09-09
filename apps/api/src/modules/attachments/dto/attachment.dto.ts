import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttachmentStage } from '@journalx/domain';

export class UploadAttachmentDto {
  @ApiPropertyOptional({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsOptional()
  @IsString()
  journalId?: string;

  @ApiPropertyOptional({ example: 'b947c617-640a-4061-9c86-f61b7fcf7c73' })
  @IsOptional()
  @IsString()
  tradeId?: string;

  @ApiPropertyOptional({ enum: AttachmentStage, example: AttachmentStage.ENTRY })
  @IsOptional()
  @IsEnum(AttachmentStage)
  stage?: AttachmentStage;

  @ApiPropertyOptional({ example: '5M' })
  @IsOptional()
  @IsString()
  timeframe?: string;

  @ApiPropertyOptional({ example: '5M MSS and FVG entry test confirmation' })
  @IsOptional()
  @IsString()
  caption?: string;
}

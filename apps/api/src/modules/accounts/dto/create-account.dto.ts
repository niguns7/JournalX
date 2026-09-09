import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AccountStatus, AccountType } from '@journalx/domain';
import { AccountRiskDefaultsJson } from '@journalx/domain';

export class CreateAccountDto {
  @ApiProperty({ example: 'Apex 50K Evaluation #1' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: AccountType, default: AccountType.EVALUATION })
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiPropertyOptional({ example: '50000.00' })
  @IsOptional()
  @IsString()
  nominalSize?: string;

  @ApiPropertyOptional({ example: '2500.00' })
  @IsOptional()
  @IsString()
  riskBasisAmount?: string;

  @ApiPropertyOptional({ enum: AccountStatus, default: AccountStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus = AccountStatus.ACTIVE;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: {
      maxDailyTrades: 3,
      maxDailyLoss: '500.00',
      consecutiveLossLimit: 2,
      maxContractsPerTrade: 5,
      maxRiskPerTrade: '250.00',
    },
  })
  @IsOptional()
  riskDefaultsJson?: AccountRiskDefaultsJson;
}

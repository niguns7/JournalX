import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module.js';
import { DatabaseModule } from './modules/database/database.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { InstrumentsModule } from './modules/instruments/instruments.module.js';
import { StrategiesModule } from './modules/strategies/strategies.module.js';
import { JournalsModule } from './modules/journals/journals.module.js';
import { TradesModule } from './modules/trades/trades.module.js';
import { AttachmentsModule } from './modules/attachments/attachments.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { ExportsModule } from './modules/exports/exports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    CommonModule,
    DatabaseModule,
    HealthModule,
    SettingsModule,
    AccountsModule,
    InstrumentsModule,
    StrategiesModule,
    JournalsModule,
    TradesModule,
    AttachmentsModule,
    AnalyticsModule,
    ExportsModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { StrategiesController } from './strategies.controller.js';
import { StrategiesService } from './strategies.service.js';

@Module({
  controllers: [StrategiesController],
  providers: [StrategiesService],
  exports: [StrategiesService],
})
export class StrategiesModule {}

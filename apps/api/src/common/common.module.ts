import { Global, Module } from '@nestjs/common';
import { AuditService } from './services/audit.service.js';
import { IdempotencyService } from './services/idempotency.service.js';

@Global()
@Module({
  providers: [AuditService, IdempotencyService],
  exports: [AuditService, IdempotencyService],
})
export class CommonModule {}

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDatabaseClient, Database } from '@journalx/db';
import type pg from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public db!: Database;
  public pool!: pg.Pool;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const client = createDatabaseClient(databaseUrl);
    this.db = client.db;
    this.pool = client.pool;

    try {
      await this.pool.query('SELECT 1');
      this.logger.log('Database connection pool established and verified.');
    } catch (error) {
      this.logger.error('Failed to establish database connection pool:', error);
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Database connection pool closed.');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service.js';
import { attachments } from '@journalx/db';
import { eq } from 'drizzle-orm';
import { UploadAttachmentDto } from './dto/attachment.dto.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AuditAction } from '@journalx/domain';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface ValidatedFileSignature {
  isValid: boolean;
  mimeType: string;
  extension: string;
}

export interface UploadedFilePayload {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly storageDir: string;
  private readonly maxBytes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {
    this.storageDir = path.resolve(
      this.configService.get<string>('STORAGE_DIR', './storage/attachments'),
    );
    const maxMb = this.configService.get<number>('MAX_UPLOAD_SIZE_MB', 10);
    this.maxBytes = maxMb * 1024 * 1024;

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Validates file signature (magic bytes) for PNG, JPEG, and WebP.
   */
  validateSignature(buffer: Buffer): ValidatedFileSignature {
    if (!buffer || buffer.length < 12) {
      return { isValid: false, mimeType: '', extension: '' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { isValid: true, mimeType: 'image/png', extension: 'png' };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true, mimeType: 'image/jpeg', extension: 'jpg' };
    }

    // WebP: RIFF ... WEBP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { isValid: true, mimeType: 'image/webp', extension: 'webp' };
    }

    return { isValid: false, mimeType: '', extension: '' };
  }

  async uploadAttachment(
    file: UploadedFilePayload,
    dto: UploadAttachmentDto,
    requestId?: string,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided for upload.');
    }

    if (file.buffer.length > this.maxBytes) {
      throw new PayloadTooLargeException(
        `File size (${(file.buffer.length / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size (${this.maxBytes / 1024 / 1024} MB).`,
      );
    }

    const sig = this.validateSignature(file.buffer);
    if (!sig.isValid) {
      throw new UnsupportedMediaTypeException(
        'Unsupported file format. Only PNG, JPEG, and WebP chart images are accepted.',
      );
    }

    // Must belong to either journal or trade or neither, but not both
    if (dto.journalId && dto.tradeId) {
      throw new BadRequestException('Attachment must belong to either a journal OR a trade, not both.');
    }

    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `${uuidv4()}.${sig.extension}`;
    const targetFilePath = path.join(this.storageDir, storageKey);

    // Write file to persistent storage
    try {
      await fs.promises.writeFile(targetFilePath, file.buffer);
    } catch (err) {
      this.logger.error(`Failed to write file to disk at ${targetFilePath}`, err);
      throw new BadRequestException('Failed to store file on server disk.');
    }

    // Insert database record with compensation
    try {
      const [created] = await this.databaseService.db
        .insert(attachments)
        .values({
          storageKey,
          originalName: file.originalname || `upload.${sig.extension}`,
          mimeType: sig.mimeType,
          bytes: file.buffer.length,
          checksum,
          journalId: dto.journalId ?? null,
          tradeId: dto.tradeId ?? null,
          stage: dto.stage ?? null,
          timeframe: dto.timeframe ?? null,
          caption: dto.caption ?? null,
        })
        .returning();

      await this.auditService.record({
        entityType: 'attachments',
        entityId: created.id,
        action: AuditAction.CREATE,
        afterJson: created,
        requestId,
      });

      return created;
    } catch (dbErr) {
      // Compensation: remove written file on database error
      this.logger.warn(`Database insert failed for attachment; rolling back file ${targetFilePath}`);
      if (fs.existsSync(targetFilePath)) {
        await fs.promises.unlink(targetFilePath).catch(() => {});
      }
      throw dbErr;
    }
  }

  async getAttachmentById(id: string) {
    const [record] = await this.databaseService.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);

    if (!record) {
      throw new NotFoundException(`Attachment '${id}' not found.`);
    }

    return record;
  }

  async getAttachmentContent(id: string) {
    const record = await this.getAttachmentById(id);
    const filePath = path.join(this.storageDir, record.storageKey);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Attachment file content missing on disk.');
    }

    const stream = fs.createReadStream(filePath);
    return {
      stream,
      record,
    };
  }

  async deleteAttachment(id: string, requestId?: string) {
    const record = await this.getAttachmentById(id);
    const filePath = path.join(this.storageDir, record.storageKey);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath).catch(() => {});
    }

    await this.databaseService.db.delete(attachments).where(eq(attachments.id, id));

    await this.auditService.record({
      entityType: 'attachments',
      entityId: id,
      action: AuditAction.DELETE,
      beforeJson: record,
      requestId,
    });

    return { success: true };
  }
}

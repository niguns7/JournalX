import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  Res,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';
import { AttachmentsService, UploadedFilePayload } from './attachments.service.js';
import { UploadAttachmentDto } from './dto/attachment.dto.js';

@ApiTags('Attachments')
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload chart screenshot evidence (PNG, JPEG, WebP, max 10MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiHeader({ name: 'x-request-id', required: false })
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ status: 201, description: 'File uploaded' })
  @ApiResponse({ status: 413, description: 'Payload too large (>10MB)' })
  @ApiResponse({ status: 415, description: 'Unsupported media type' })
  async uploadAttachment(
    @UploadedFile() file: UploadedFilePayload,
    @Body() dto: UploadAttachmentDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.attachmentsService.uploadAttachment(file, dto, requestId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attachment metadata' })
  @ApiResponse({ status: 200, description: 'Attachment metadata' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getAttachmentById(@Param('id') id: string) {
    return this.attachmentsService.getAttachmentById(id);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'Stream attachment image content' })
  @ApiResponse({ status: 200, description: 'Binary image stream' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getAttachmentContent(@Param('id') id: string, @Res() res: Response) {
    const { stream, record } = await this.attachmentsService.getAttachmentContent(id);

    res.set({
      'Content-Type': record.mimeType,
      'Content-Length': record.bytes.toString(),
      'Content-Disposition': `inline; filename="${encodeURIComponent(record.originalName)}"`,
      'Cache-Control': 'public, max-age=86400',
    });

    stream.pipe(res);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attachment and file' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Attachment deleted' })
  async deleteAttachment(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.attachmentsService.deleteAttachment(id, requestId);
  }
}

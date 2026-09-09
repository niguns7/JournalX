import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { InstrumentsService } from './instruments.service.js';
import { CreateInstrumentDto, UpdateInstrumentDto } from './dto/create-instrument.dto.js';

@ApiTags('Instruments')
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List instruments' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  async listInstruments(@Query('includeArchived') includeArchived?: string) {
    return this.instrumentsService.listInstruments(includeArchived === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get instrument by ID' })
  @ApiResponse({ status: 200, description: 'Instrument found' })
  @ApiResponse({ status: 404, description: 'Instrument not found' })
  async getInstrumentById(@Param('id') id: string) {
    return this.instrumentsService.getInstrumentById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new instrument' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 201, description: 'Instrument created' })
  @ApiResponse({ status: 409, description: 'Symbol conflict' })
  async createInstrument(
    @Body() dto: CreateInstrumentDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.instrumentsService.createInstrument(dto, requestId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update instrument' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Instrument updated' })
  async updateInstrument(
    @Param('id') id: string,
    @Body() dto: UpdateInstrumentDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.instrumentsService.updateInstrument(id, dto, requestId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive instrument' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Instrument archived' })
  async archiveInstrument(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.instrumentsService.archiveInstrument(id, requestId);
  }
}

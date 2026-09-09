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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { StrategiesService } from './strategies.service.js';
import {
  CreateStrategyDto,
  UpdateStrategyDto,
  CreateStrategyVersionDto,
  UpdateStrategyVersionDto,
} from './dto/create-strategy.dto.js';

@ApiTags('Strategies')
@Controller('strategies')
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  @Get()
  @ApiOperation({ summary: 'List all strategies with current published version' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  async listStrategies(@Query('includeArchived') includeArchived?: string) {
    return this.strategiesService.listStrategies(includeArchived === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get strategy by ID with versions' })
  @ApiResponse({ status: 200, description: 'Strategy found' })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  async getStrategyById(@Param('id') id: string) {
    return this.strategiesService.getStrategyById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new strategy with initial version' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 201, description: 'Strategy created' })
  async createStrategy(
    @Body() dto: CreateStrategyDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.strategiesService.createStrategy(dto, requestId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update strategy name/description' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Strategy updated' })
  async updateStrategy(
    @Param('id') id: string,
    @Body() dto: UpdateStrategyDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.strategiesService.updateStrategy(id, dto, requestId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive strategy' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Strategy archived' })
  async archiveStrategy(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.strategiesService.archiveStrategy(id, requestId);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List all versions of a strategy' })
  async listVersions(@Param('id') id: string) {
    return this.strategiesService.listVersions(id);
  }

  @Get(':id/versions/:versionId')
  @ApiOperation({ summary: 'Get specific strategy version' })
  async getVersionById(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.strategiesService.getVersionById(id, versionId);
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Create a new draft version for strategy' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 201, description: 'Draft version created' })
  async createDraftVersion(
    @Param('id') id: string,
    @Body() dto: CreateStrategyVersionDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.strategiesService.createDraftVersion(id, dto, requestId);
  }

  @Patch(':id/versions/:versionId')
  @ApiOperation({ summary: 'Update draft version rules/checklist/narrative' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Draft version updated' })
  @ApiResponse({ status: 400, description: 'Cannot update published version' })
  async updateDraftVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() dto: UpdateStrategyVersionDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.strategiesService.updateDraftVersion(id, versionId, dto, requestId);
  }

  @Post(':id/versions/:versionId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish strategy version making it immutable' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Version published successfully' })
  async publishVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.strategiesService.publishVersion(id, versionId, requestId);
  }
}

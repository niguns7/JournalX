import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { JournalsService } from './journals.service.js';
import {
  CreateJournalDto,
  UpdateJournalDto,
  CompleteJournalReviewDto,
  ReopenJournalDto,
  CreateWindowDto,
  UpdateWindowDto,
  CreateEconomicEventDto,
  UpdateEconomicEventDto,
  CreateTimeframeAnalysisDto,
  UpdateTimeframeAnalysisDto,
  CreateMarketZoneDto,
  UpdateMarketZoneDto,
  CreateScenarioDto,
  UpdateScenarioDto,
  CreateQuarterObservationDto,
  UpdateQuarterObservationDto,
  UpdateJournalAccountLimitDto,
} from './dto/journal.dto.js';
import { DailyGrade, JournalStatus } from '@journalx/domain';

@ApiTags('Journals')
@Controller('journals')
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create or get existing journal for calendar date (idempotent)' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Journal created or retrieved' })
  async createOrGetJournal(
    @Body() dto: CreateJournalDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.journalsService.createOrGetJournal(dto, requestId);
  }

  @Get()
  @ApiOperation({ summary: 'List journals with optional filters and pagination' })
  @ApiQuery({ name: 'from', required: false, example: '2026-09-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-09-30' })
  @ApiQuery({ name: 'status', enum: JournalStatus, required: false })
  @ApiQuery({ name: 'grade', enum: DailyGrade, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  async listJournals(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: JournalStatus,
    @Query('grade') grade?: DailyGrade,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.journalsService.listJournals({ from, to, status, grade, page, pageSize });
  }

  @Get('by-date/:date')
  @ApiOperation({ summary: 'Get journal by date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Journal found' })
  @ApiResponse({ status: 404, description: 'Journal not found' })
  async getJournalByDate(@Param('date') date: string) {
    return this.journalsService.getJournalByDate(date);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journal by ID with all sections' })
  @ApiResponse({ status: 200, description: 'Journal found' })
  @ApiResponse({ status: 404, description: 'Journal not found' })
  async getJournalById(@Param('id') id: string) {
    return this.journalsService.getJournalById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update journal preparation, readiness, and notes' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Journal updated' })
  @ApiResponse({ status: 409, description: 'Version conflict' })
  async updateJournal(
    @Param('id') id: string,
    @Body() dto: UpdateJournalDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.journalsService.updateJournal(id, dto, requestId);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate daily journal' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Journal activated' })
  async activateJournal(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.journalsService.activateJournal(id, requestId);
  }

  @Post(':id/complete-review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete end-of-day review (blocks if open trades or unconfirmed fees)' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Review completed' })
  @ApiResponse({ status: 400, description: 'Review blocked by pending trades or fees' })
  async completeReview(
    @Param('id') id: string,
    @Body() dto: CompleteJournalReviewDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.journalsService.completeReview(id, dto, requestId);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reopen reviewed journal with mandatory audit reason' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Journal reopened' })
  @ApiResponse({ status: 400, description: 'Missing reason' })
  async reopenJournal(
    @Param('id') id: string,
    @Body() dto: ReopenJournalDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.journalsService.reopenJournal(id, dto, requestId);
  }

  // Windows
  @Get(':id/windows')
  @ApiOperation({ summary: 'List trading windows for journal' })
  async listWindows(@Param('id') id: string) {
    return this.journalsService.listWindows(id);
  }

  @Post(':id/windows')
  @ApiOperation({ summary: 'Create trading window for journal' })
  async createWindow(@Param('id') id: string, @Body() dto: CreateWindowDto) {
    return this.journalsService.createWindow(id, dto);
  }

  @Patch(':id/windows/:windowId')
  @ApiOperation({ summary: 'Update trading window' })
  async updateWindow(
    @Param('id') id: string,
    @Param('windowId') windowId: string,
    @Body() dto: UpdateWindowDto,
  ) {
    return this.journalsService.updateWindow(id, windowId, dto);
  }

  @Delete(':id/windows/:windowId')
  @ApiOperation({ summary: 'Delete trading window' })
  async deleteWindow(
    @Param('id') id: string,
    @Param('windowId') windowId: string,
  ) {
    return this.journalsService.deleteWindow(id, windowId);
  }

  // Events
  @Get(':id/events')
  @ApiOperation({ summary: 'List economic events for journal' })
  async listEvents(@Param('id') id: string) {
    return this.journalsService.listEvents(id);
  }

  @Post(':id/events')
  @ApiOperation({ summary: 'Create economic event for journal' })
  async createEvent(@Param('id') id: string, @Body() dto: CreateEconomicEventDto) {
    return this.journalsService.createEvent(id, dto);
  }

  @Patch(':id/events/:eventId')
  @ApiOperation({ summary: 'Update economic event' })
  async updateEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEconomicEventDto,
  ) {
    return this.journalsService.updateEvent(id, eventId, dto);
  }

  @Delete(':id/events/:eventId')
  @ApiOperation({ summary: 'Delete economic event' })
  async deleteEvent(
    @Param('id') id: string,
    @Param('eventId') eventId: string,
  ) {
    return this.journalsService.deleteEvent(id, eventId);
  }

  // Analyses
  @Get(':id/analyses')
  @ApiOperation({ summary: 'List timeframe analyses for journal' })
  async listAnalyses(@Param('id') id: string) {
    return this.journalsService.listAnalyses(id);
  }

  @Post(':id/analyses')
  @ApiOperation({ summary: 'Create timeframe analysis for journal' })
  async createAnalysis(@Param('id') id: string, @Body() dto: CreateTimeframeAnalysisDto) {
    return this.journalsService.createAnalysis(id, dto);
  }

  @Patch(':id/analyses/:analysisId')
  @ApiOperation({ summary: 'Update timeframe analysis' })
  async updateAnalysis(
    @Param('id') id: string,
    @Param('analysisId') analysisId: string,
    @Body() dto: UpdateTimeframeAnalysisDto,
  ) {
    return this.journalsService.updateAnalysis(id, analysisId, dto);
  }

  @Delete(':id/analyses/:analysisId')
  @ApiOperation({ summary: 'Delete timeframe analysis' })
  async deleteAnalysis(
    @Param('id') id: string,
    @Param('analysisId') analysisId: string,
  ) {
    return this.journalsService.deleteAnalysis(id, analysisId);
  }

  // Zones
  @Get(':id/analyses/:analysisId/zones')
  @ApiOperation({ summary: 'List market zones for analysis' })
  async listZones(@Param('analysisId') analysisId: string) {
    return this.journalsService.listZones(analysisId);
  }

  @Post(':id/analyses/:analysisId/zones')
  @ApiOperation({ summary: 'Create market zone' })
  async createZone(
    @Param('analysisId') analysisId: string,
    @Body() dto: CreateMarketZoneDto,
  ) {
    return this.journalsService.createZone(analysisId, dto);
  }

  @Patch(':id/analyses/:analysisId/zones/:zoneId')
  @ApiOperation({ summary: 'Update market zone' })
  async updateZone(
    @Param('analysisId') analysisId: string,
    @Param('zoneId') zoneId: string,
    @Body() dto: UpdateMarketZoneDto,
  ) {
    return this.journalsService.updateZone(analysisId, zoneId, dto);
  }

  @Delete(':id/analyses/:analysisId/zones/:zoneId')
  @ApiOperation({ summary: 'Delete market zone' })
  async deleteZone(
    @Param('analysisId') analysisId: string,
    @Param('zoneId') zoneId: string,
  ) {
    return this.journalsService.deleteZone(analysisId, zoneId);
  }

  // Scenarios
  @Get(':id/scenarios')
  @ApiOperation({ summary: 'List scenarios for journal' })
  async listScenarios(@Param('id') id: string) {
    return this.journalsService.listScenarios(id);
  }

  @Post(':id/scenarios')
  @ApiOperation({ summary: 'Create scenario for journal' })
  async createScenario(@Param('id') id: string, @Body() dto: CreateScenarioDto) {
    return this.journalsService.createScenario(id, dto);
  }

  @Patch(':id/scenarios/:scenarioId')
  @ApiOperation({ summary: 'Update scenario' })
  async updateScenario(
    @Param('id') id: string,
    @Param('scenarioId') scenarioId: string,
    @Body() dto: UpdateScenarioDto,
  ) {
    return this.journalsService.updateScenario(id, scenarioId, dto);
  }

  @Delete(':id/scenarios/:scenarioId')
  @ApiOperation({ summary: 'Delete scenario' })
  async deleteScenario(
    @Param('id') id: string,
    @Param('scenarioId') scenarioId: string,
  ) {
    return this.journalsService.deleteScenario(id, scenarioId);
  }

  // Quarters
  @Get(':id/windows/:windowId/quarters')
  @ApiOperation({ summary: 'List quarter observations for window' })
  async listQuarters(@Param('windowId') windowId: string) {
    return this.journalsService.listQuarters(windowId);
  }

  @Post(':id/windows/:windowId/quarters')
  @ApiOperation({ summary: 'Create quarter observation for window' })
  async createQuarter(
    @Param('windowId') windowId: string,
    @Body() dto: CreateQuarterObservationDto,
  ) {
    return this.journalsService.createQuarter(windowId, dto);
  }

  @Patch(':id/windows/:windowId/quarters/:quarterObsId')
  @ApiOperation({ summary: 'Update quarter observation' })
  async updateQuarter(
    @Param('windowId') windowId: string,
    @Param('quarterObsId') quarterObsId: string,
    @Body() dto: UpdateQuarterObservationDto,
  ) {
    return this.journalsService.updateQuarter(windowId, quarterObsId, dto);
  }

  @Delete(':id/windows/:windowId/quarters/:quarterObsId')
  @ApiOperation({ summary: 'Delete quarter observation' })
  async deleteQuarter(
    @Param('windowId') windowId: string,
    @Param('quarterObsId') quarterObsId: string,
  ) {
    return this.journalsService.deleteQuarter(windowId, quarterObsId);
  }

  // Limits
  @Put(':id/limits/:accountId')
  @ApiOperation({ summary: 'Update account limits snapshot for journal' })
  async updateAccountLimit(
    @Param('id') journalId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateJournalAccountLimitDto,
  ) {
    return this.journalsService.updateAccountLimit(journalId, accountId, dto);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { TradesService } from './trades.service.js';
import {
  CreateTradePlanDto,
  UpdateTradePlanDto,
  OpenTradeDto,
  RecordExecutionDto,
  CloseTradeDto,
  AddManagementEventDto,
  SaveChecklistAnswersDto,
  ReviewTradeDto,
  CorrectTradeDto,
  VoidTradeDto,
  TradeQueryDto,
} from './dto/trade.dto.js';

@ApiTags('Trades')
@Controller('trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Get()
  @ApiOperation({ summary: 'List trades with filtering and pagination' })
  async listTrades(@Query() query: TradeQueryDto) {
    return this.tradesService.listTrades(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trade by ID with all details' })
  @ApiResponse({ status: 200, description: 'Trade found' })
  @ApiResponse({ status: 404, description: 'Trade not found' })
  async getTradeById(@Param('id') id: string) {
    return this.tradesService.getTradeById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new planned trade' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 201, description: 'Trade plan created' })
  async createTradePlan(
    @Body() dto: CreateTradePlanDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.tradesService.createTradePlan(dto, requestId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a planned trade' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Trade plan updated' })
  @ApiResponse({ status: 400, description: 'Not in PLANNED state' })
  @ApiResponse({ status: 409, description: 'Version conflict' })
  async updateTradePlan(
    @Param('id') id: string,
    @Body() dto: UpdateTradePlanDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.tradesService.updateTradePlan(id, dto, requestId);
  }

  @Post(':id/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate trade eligibility against rules and daily limits' })
  async evaluateTrade(@Param('id') id: string) {
    return this.tradesService.evaluateTrade(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a planned trade' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Trade cancelled' })
  async cancelTradePlan(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.tradesService.cancelTradePlan(id, requestId);
  }

  @Post(':id/open')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Open trade execution (freezes snapshot, checks locks and limits)' })
  @ApiHeader({ name: 'idempotency-key', required: false })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Trade opened' })
  @ApiResponse({ status: 409, description: 'Version conflict or idempotency mismatch' })
  async openTrade(
    @Param('id') id: string,
    @Body() dto: OpenTradeDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.tradesService.openTrade(id, dto, idempotencyKey, requestId);
  }

  @Post('record-execution')
  @ApiOperation({ summary: 'Atomically record retrospective trade execution (OPEN or CLOSED)' })
  @ApiHeader({ name: 'idempotency-key', required: false })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 201, description: 'Execution recorded' })
  @ApiResponse({ status: 409, description: 'Idempotency conflict' })
  async recordExecution(
    @Body() dto: RecordExecutionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.tradesService.recordExecution(dto, idempotencyKey, requestId);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an open trade and calculate realized metrics' })
  @ApiHeader({ name: 'idempotency-key', required: false })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Trade closed' })
  @ApiResponse({ status: 409, description: 'Version conflict or idempotency mismatch' })
  async closeTrade(
    @Param('id') id: string,
    @Body() dto: CloseTradeDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.tradesService.closeTrade(id, dto, idempotencyKey, requestId);
  }

  @Post(':id/management-events')
  @ApiOperation({ summary: 'Record management event (stop loss / take profit move)' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 201, description: 'Management event added' })
  async addManagementEvent(
    @Param('id') id: string,
    @Body() dto: AddManagementEventDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.tradesService.addManagementEvent(id, dto, requestId);
  }

  @Put(':id/checklist')
  @ApiOperation({ summary: 'Save checklist answers for trade' })
  async saveChecklistAnswers(
    @Param('id') id: string,
    @Body() dto: SaveChecklistAnswersDto,
  ) {
    return this.tradesService.saveChecklistAnswers(id, dto);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Review closed trade (requires confirmed fees)' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Trade reviewed' })
  @ApiResponse({ status: 400, description: 'Unconfirmed fees or trade not closed' })
  async reviewTrade(
    @Param('id') id: string,
    @Body() dto: ReviewTradeDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.tradesService.reviewTrade(id, dto, requestId);
  }

  @Post(':id/correct')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Audited correction of closed trade execution' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Trade corrected' })
  @ApiResponse({ status: 409, description: 'Version conflict' })
  async correctTrade(
    @Param('id') id: string,
    @Body() dto: CorrectTradeDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.tradesService.correctTrade(id, dto, requestId);
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void trade with mandatory reason' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Trade voided' })
  @ApiResponse({ status: 409, description: 'Version conflict' })
  async voidTrade(
    @Param('id') id: string,
    @Body() dto: VoidTradeDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.tradesService.voidTrade(id, dto, requestId);
  }
}

import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportsService } from './exports.service.js';
import { TradeQueryDto } from '../trades/dto/trade.dto.js';

@ApiTags('Exports')
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('trades.csv')
  @ApiOperation({ summary: 'Export filtered trades as CSV' })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportTradesCsv(@Query() query: TradeQueryDto, @Res() res: Response) {
    const csvContent = await this.exportsService.exportTradesCsv(query);

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="trades-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-cache',
    });

    res.send(csvContent);
  }

  @Get('journals.csv')
  @ApiOperation({ summary: 'Export filtered journals as CSV' })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportJournalsCsv(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const csvContent = await this.exportsService.exportJournalsCsv(from, to);

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="journals-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-cache',
    });

    res.send(csvContent);
  }
}

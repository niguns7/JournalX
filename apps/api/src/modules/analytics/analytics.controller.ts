import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregate performance summary and key metrics' })
  async getSummary(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSummary(query);
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily aggregated trade results' })
  async getDaily(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getDaily(query);
  }

  @Get('equity')
  @ApiOperation({ summary: 'Get realized trade equity curve and drawdown series' })
  async getEquityCurve(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getEquityCurve(query);
  }

  @Get('breakdowns')
  @ApiOperation({ summary: 'Get breakdowns by direction, window, and setups' })
  async getBreakdowns(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getBreakdowns(query);
  }

  @Get('discipline')
  @ApiOperation({ summary: 'Get discipline metrics and good loss / bad win matrix' })
  async getDiscipline(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getDiscipline(query);
  }
}

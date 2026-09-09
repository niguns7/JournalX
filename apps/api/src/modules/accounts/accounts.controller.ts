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
import { AccountsService } from './accounts.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';
import { AccountStatus } from '@journalx/domain';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List trading accounts' })
  @ApiQuery({ name: 'status', enum: AccountStatus, required: false })
  async listAccounts(@Query('status') status?: AccountStatus) {
    return this.accountsService.listAccounts(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trading account by ID' })
  @ApiResponse({ status: 200, description: 'Account found' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccountById(@Param('id') id: string) {
    return this.accountsService.getAccountById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new trading account' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 201, description: 'Account created' })
  async createAccount(
    @Body() dto: CreateAccountDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.accountsService.createAccount(dto, requestId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update trading account' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Account updated' })
  @ApiResponse({ status: 409, description: 'Version conflict' })
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.accountsService.updateAccount(id, dto, requestId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive trading account' })
  @ApiHeader({ name: 'x-request-id', required: false })
  @ApiResponse({ status: 200, description: 'Account archived' })
  async archiveAccount(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.accountsService.archiveAccount(id, requestId);
  }
}

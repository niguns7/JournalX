import React, { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Button,
  Table,
  Select,
  Checkbox,
  Pagination,
  SimpleGrid,
} from '@mantine/core';
import {
  IconDownload,
  IconPlus,
  IconFilter,
  IconArrowRight,
  IconReceipt,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import {
  formatCurrency,
  formatR,
  formatDate,
  formatTime,
  getOutcomeBadge,
} from '../../../lib/formatters.js';

interface TradeLogPageProps {
  onOpenTradePlan?: () => void;
  onOpenRecordExecution?: () => void;
}

export const TradeLogPage: React.FC<TradeLogPageProps> = ({
  onOpenTradePlan,
  onOpenRecordExecution,
}) => {
  const navigate = useNavigate();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('acc-demo-50k');
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string | null>(null);
  const [includeVoided, setIncludeVoided] = useState(false);
  const [page, setPage] = useState(1);

  const { data: accounts = [] } = useQuery({
    queryKey: queryKeys.accounts.list(),
    queryFn: () => apiClient.accounts.list(),
  });

  const { data: tradesResponse, isLoading } = useQuery({
    queryKey: queryKeys.trades.list({
      accountId: selectedAccountId,
      outcome: selectedOutcome,
      page,
      includeVoided,
    }),
    queryFn: () =>
      apiClient.trades.list({
        accountId: selectedAccountId,
        outcome: (selectedOutcome as any) || undefined,
        includeVoided,
        page,
        pageSize: 15,
      }),
  });

  const trades = tradesResponse?.items || [];
  const totalTrades = tradesResponse?.total || trades.length;

  const handleExportCsv = () => {
    const csvUrl = apiClient.exports.getTradesCsvUrl({
      accountId: selectedAccountId,
      outcome: selectedOutcome || undefined,
    });
    window.open(csvUrl, '_blank');
  };

  return (
    <Stack gap="lg">
      {/* Header Bar */}
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Group justify="space-between" wrap="wrap" gap="md">
          <div>
            <Title order={2} style={{ color: '#1e293b', fontWeight: 700 }}>
              Master Trade Log & Execution History
            </Title>
            <Text c="dimmed" size="sm">
              Comprehensive record of planned, open, closed, and reviewed trades
            </Text>
          </div>

          <Group gap="sm">
            <Button
              variant="outline"
              color="indigo"
              size="sm"
              leftSection={<IconDownload size={16} />}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
            <Button
              variant="filled"
              color="indigo"
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={onOpenTradePlan}
            >
              Plan Trade
            </Button>
            <Button
              variant="light"
              color="indigo"
              size="sm"
              onClick={onOpenRecordExecution}
            >
              Record Execution
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Filter Bar */}
      <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
          <Select
            label="Trading Account"
            size="xs"
            data={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
            value={selectedAccountId}
            onChange={(val) => val && setSelectedAccountId(val)}
          />

          <Select
            label="Outcome"
            size="xs"
            placeholder="All Outcomes"
            clearable
            data={[
              { value: 'WIN', label: 'Winning Trades (WIN)' },
              { value: 'LOSS', label: 'Losing Trades (LOSS)' },
              { value: 'BREAKEVEN', label: 'Breakeven (BE)' },
            ]}
            value={selectedOutcome}
            onChange={setSelectedOutcome}
          />

          <Select
            label="Review Status"
            size="xs"
            placeholder="All Statuses"
            clearable
            data={[
              { value: 'reviewed', label: 'Reviewed' },
              { value: 'pending', label: 'Pending Review' },
            ]}
            value={selectedReviewStatus}
            onChange={setSelectedReviewStatus}
          />

          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '6px' }}>
            <Checkbox
              label="Include Voided Trades"
              checked={includeVoided}
              onChange={(e) => setIncludeVoided(e.target.checked)}
            />
          </div>
        </SimpleGrid>
      </Paper>

      {/* Trades Table */}
      <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
        <Table.ScrollContainer minWidth={900}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Entry Time</Table.Th>
                <Table.Th>Contract</Table.Th>
                <Table.Th>Dir</Table.Th>
                <Table.Th>Qty</Table.Th>
                <Table.Th>Entry &rarr; Exit</Table.Th>
                <Table.Th>Risk ($)</Table.Th>
                <Table.Th>Net P/L</Table.Th>
                <Table.Th>Net R</Table.Th>
                <Table.Th>Outcome</Table.Th>
                <Table.Th>Process Grade</Table.Th>
                <Table.Th>State</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {trades.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={12} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    No trades match the current filter criteria.
                  </Table.Td>
                </Table.Tr>
              ) : (
                trades.map((trade: any) => {
                  const outcomeBadge = getOutcomeBadge(
                    trade.outcome,
                    trade.review?.isGoodLoss,
                    trade.review?.isBadWin,
                  );
                  return (
                    <Table.Tr
                      key={trade.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/trades/${trade.id}`)}
                    >
                      <Table.Td>
                        <Text size="xs" fw={600}>
                          {formatDate(trade.entryAt || trade.createdAt)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatTime(trade.entryAt || trade.createdAt)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="indigo" size="sm">
                          {trade.actualContractSymbol || 'MGC'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={trade.direction === 'LONG' ? 'teal' : 'orange'}
                          variant="filled"
                          size="xs"
                        >
                          {trade.direction}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{trade.quantity}</Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={500}>
                          {trade.actualEntry || trade.plannedEntry} &rarr; {trade.exitPrice || '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>{formatCurrency(trade.riskAmount || '250.00')}</Table.Td>
                      <Table.Td
                        fw={700}
                        c={
                          trade.netPnL === null
                            ? 'gray'
                            : parseFloat(trade.netPnL) >= 0
                            ? 'teal.7'
                            : 'red.7'
                        }
                      >
                        {trade.netPnL ? formatCurrency(trade.netPnL, 'USD', true) : 'Provisional'}
                      </Table.Td>
                      <Table.Td fw={700} c="indigo.7">
                        {trade.netR ? formatR(trade.netR) : '—'}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={outcomeBadge.color} variant={outcomeBadge.variant} size="sm">
                          {outcomeBadge.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {trade.review?.disciplineScore ? (
                          <Badge color="teal" variant="light" size="xs">
                            {trade.review.disciplineScore}/10
                          </Badge>
                        ) : (
                          <Text size="xs" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="outline" color="gray" size="xs">
                          {trade.state}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Button
                          size="xs"
                          variant="light"
                          color="indigo"
                          rightSection={<IconArrowRight size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/trades/${trade.id}`);
                          }}
                        >
                          View
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {totalTrades > 15 && (
          <Group justify="center" mt="md">
            <Pagination total={Math.ceil(totalTrades / 15)} value={page} onChange={setPage} />
          </Group>
        )}
      </Card>
    </Stack>
  );
};

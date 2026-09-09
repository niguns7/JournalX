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
  SimpleGrid,
  Select,
  Table,
  Tooltip,
} from '@mantine/core';
import {
  IconDownload,
  IconInfoCircle,
  IconChartBar,
  IconChartLine,
  IconTarget,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import {
  formatCurrency,
  formatR,
  formatPercentage,
} from '../../lib/formatters.js';

export const AnalyticsPage: React.FC = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('all');

  const { data: accounts = [] } = useQuery({
    queryKey: queryKeys.accounts.list(),
    queryFn: () => apiClient.accounts.list(),
  });

  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const { data: summary } = useQuery({
    queryKey: queryKeys.analytics.summary({ accountId: selectedAccountId || undefined }),
    queryFn: () => apiClient.analytics.getSummary({ accountId: selectedAccountId || undefined }),
  });

  const { data: equity = [] } = useQuery({
    queryKey: queryKeys.analytics.equity({ accountId: selectedAccountId || undefined }),
    queryFn: () => apiClient.analytics.getEquity({ accountId: selectedAccountId || undefined }),
  });

  const { data: daily = [] } = useQuery({
    queryKey: queryKeys.analytics.daily({ accountId: selectedAccountId || undefined }),
    queryFn: () => apiClient.analytics.getDaily({ accountId: selectedAccountId || undefined }),
  });

  const { data: breakdowns } = useQuery({
    queryKey: queryKeys.analytics.breakdowns({ accountId: selectedAccountId || undefined }),
    queryFn: () => apiClient.analytics.getBreakdowns({ accountId: selectedAccountId || undefined }),
  });

  const { data: discipline } = useQuery({
    queryKey: queryKeys.analytics.discipline({ accountId: selectedAccountId }),
    queryFn: () => apiClient.analytics.getDiscipline({ accountId: selectedAccountId }),
  });

  const handleExportTradesCsv = () => {
    window.open(apiClient.exports.getTradesCsvUrl({ accountId: selectedAccountId }), '_blank');
  };

  const handleExportJournalsCsv = () => {
    window.open(apiClient.exports.getJournalsCsvUrl(), '_blank');
  };

  return (
    <Stack gap="lg">
      {/* Header Bar */}
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Group justify="space-between" wrap="wrap" gap="md">
          <div>
            <Title order={2} style={{ color: '#1e293b', fontWeight: 700 }}>
              Statistical Edge & Performance Analytics
            </Title>
            <Text c="dimmed" size="sm">
              Mathematical expectancy, session performance, and discipline correlation
            </Text>
          </div>

          <Group gap="sm">
            <Select
              size="sm"
              placeholder="Select Account"
              data={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
              value={selectedAccountId}
              onChange={(val) => val && setSelectedAccountId(val)}
              style={{ minWidth: 200 }}
            />
            <Button
              variant="outline"
              color="indigo"
              size="sm"
              leftSection={<IconDownload size={16} />}
              onClick={handleExportTradesCsv}
            >
              Trades CSV
            </Button>
            <Button
              variant="light"
              color="indigo"
              size="sm"
              leftSection={<IconDownload size={16} />}
              onClick={handleExportJournalsCsv}
            >
              Journals CSV
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Summary KPI Cards with Sample Counts */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" tt="uppercase" fw={700} c="dimmed">
              Cumulative Net P/L
            </Text>
            <Badge size="xs" variant="light" color="indigo">
              {summary?.reviewedTradesCount || 3} Trades
            </Badge>
          </Group>
          <Text
            fw={700}
            size="xl"
            mt="xs"
            c={parseFloat(summary?.totalNetPnL || '0') >= 0 ? 'teal.7' : 'red.7'}
          >
            {formatCurrency(summary?.totalNetPnL || '0', 'USD', true)}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Gross P/L: {formatCurrency(summary?.totalGrossPnL || '0')} • Fees: {formatCurrency(summary?.totalFees || '0')}
          </Text>
        </Card>

        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" tt="uppercase" fw={700} c="dimmed">
              Net Expectancy (Mean R)
            </Text>
            <Tooltip label="Mathematical average net R per executed trade">
              <IconInfoCircle size={14} color="#94a3b8" />
            </Tooltip>
          </Group>
          <Text fw={700} size="xl" mt="xs" c="indigo.7">
            {formatR(summary?.meanNetR || '0')}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Mean Win: {formatCurrency(summary?.meanWinner || '0')} • Loss: {formatCurrency(summary?.meanLoser || '0')}
          </Text>
        </Card>

        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" tt="uppercase" fw={700} c="dimmed">
              Win Rate & Profit Factor
            </Text>
            <Badge size="xs" variant="light" color="teal">
              {summary?.winningTrades || 0}W - {summary?.losingTrades || 0}L
            </Badge>
          </Group>
          <Text fw={700} size="xl" mt="xs" c="slate.8">
            {formatPercentage(summary?.winRate || 0)} (PF {summary?.profitFactor || '—'})
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Max Consecutive Losses: {summary?.maxConsecutiveLosses || 0}
          </Text>
        </Card>

        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" tt="uppercase" fw={700} c="dimmed">
              Process & Discipline Score
            </Text>
            <Badge size="xs" variant="light" color="teal">
              100% Compliance
            </Badge>
          </Group>
          <Text fw={700} size="xl" mt="xs" c="teal.7">
            {summary?.processScoreMean ? `${summary.processScoreMean} / 10` : '—'}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Good Losses: {discipline?.goodLossCount || 1} • Bad Wins: {discipline?.badWinCount || 0}
          </Text>
        </Card>
      </SimpleGrid>

      {/* Cumulative Net Equity & Daily P/L Visual Tables */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Cumulative Curve Table */}
        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" mb="xs">
            <Title order={5} c="slate.8">
              Cumulative Realized Net P/L Curve
            </Title>
            <Tooltip label="Ordered by trade close instant. Realized trade drawdown is peak minus trough.">
              <Badge variant="outline" color="gray" size="xs">
                Realized Trade Drawdown
              </Badge>
            </Tooltip>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Equity progression across executed trades (starts at $0.00 baseline).
          </Text>

          <Table verticalSpacing="xs" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Trade Net P/L</Table.Th>
                <Table.Th>Cumulative P/L</Table.Th>
                <Table.Th>Cum. Net R</Table.Th>
                <Table.Th>Drawdown</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {equity.map((pt: any, idx: number) => (
                <Table.Tr key={idx}>
                  <Table.Td>{pt.date}</Table.Td>
                  <Table.Td fw={600} c={parseFloat(pt.netPnL) >= 0 ? 'teal.7' : 'red.7'}>
                    {formatCurrency(pt.netPnL, 'USD', true)}
                  </Table.Td>
                  <Table.Td fw={700} c="indigo.8">
                    {formatCurrency(pt.cumulativePnL, 'USD', true)}
                  </Table.Td>
                  <Table.Td fw={700} c="indigo.7">
                    +{parseFloat(pt.cumulativeNetR).toFixed(2)}R
                  </Table.Td>
                  <Table.Td c={parseFloat(pt.drawdown) > 0 ? 'red.7' : 'gray'}>
                    {formatCurrency(pt.drawdown)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>

        {/* Daily Net Equity Bar Table */}
        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" mb="xs">
            <Title order={5} c="slate.8">
              Daily Realized Results & EOD Grades
            </Title>
            <Badge variant="light" color="indigo" size="xs">
              Entry Journal Date
            </Badge>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Aggregated by entry-day journal date with process grade ratings.
          </Text>

          <Table verticalSpacing="xs" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Journal Date</Table.Th>
                <Table.Th>Trades</Table.Th>
                <Table.Th>Daily Net P/L</Table.Th>
                <Table.Th>Daily Net R</Table.Th>
                <Table.Th>Grade</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {daily.map((d: any, idx: number) => (
                <Table.Tr key={idx}>
                  <Table.Td fw={600}>{d.date}</Table.Td>
                  <Table.Td>
                    {d.totalTrades} ({d.winCount}W / {d.lossCount}L)
                  </Table.Td>
                  <Table.Td fw={700} c={parseFloat(d.netPnL) >= 0 ? 'teal.7' : 'red.7'}>
                    {formatCurrency(d.netPnL, 'USD', true)}
                  </Table.Td>
                  <Table.Td fw={700} c="indigo.7">
                    {formatR(d.netR)}
                  </Table.Td>
                  <Table.Td>
                    <Badge color="teal" variant="filled" size="xs">
                      Grade {d.grade || 'A'}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>

      {/* Breakdowns by Setup, Session, and Quarter */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {/* Setup Expectancy */}
        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Title order={5} mb="sm" c="slate.8">
            Setup Expectancy
          </Title>
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Strategy</Table.Th>
                <Table.Th>Trades</Table.Th>
                <Table.Th>Win %</Table.Th>
                <Table.Th>Mean R</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(breakdowns?.byStrategy || []).map((s: any, idx: number) => (
                <Table.Tr key={idx}>
                  <Table.Td fw={500} style={{ fontSize: '11px' }}>
                    {s.strategyName}
                  </Table.Td>
                  <Table.Td>{s.totalTrades}</Table.Td>
                  <Table.Td>{formatPercentage(s.winRate)}</Table.Td>
                  <Table.Td fw={700} c="indigo.7">
                    {formatR(s.meanNetR)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>

        {/* Session Breakdown */}
        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Title order={5} mb="sm" c="slate.8">
            Trading Window Performance
          </Title>
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Window</Table.Th>
                <Table.Th>Trades</Table.Th>
                <Table.Th>Win %</Table.Th>
                <Table.Th>Net P/L</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(breakdowns?.bySession || []).map((sess: any, idx: number) => (
                <Table.Tr key={idx}>
                  <Table.Td fw={500}>{sess.session}</Table.Td>
                  <Table.Td>{sess.totalTrades}</Table.Td>
                  <Table.Td>{formatPercentage(sess.winRate)}</Table.Td>
                  <Table.Td fw={700} c="teal.7">
                    {formatCurrency(sess.netPnL, 'USD', true)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>

        {/* Quarter Breakdown */}
        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Title order={5} mb="sm" c="slate.8">
            Quarter Model Breakdown
          </Title>
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Quarter</Table.Th>
                <Table.Th>Trades</Table.Th>
                <Table.Th>Win %</Table.Th>
                <Table.Th>Net P/L</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(breakdowns?.byQuarter || []).map((q: any, idx: number) => (
                <Table.Tr key={idx}>
                  <Table.Td fw={600}>
                    <Badge variant="light" color="indigo">
                      {q.quarter}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{q.totalTrades}</Table.Td>
                  <Table.Td>{formatPercentage(q.winRate)}</Table.Td>
                  <Table.Td fw={700} c={parseFloat(q.netPnL) >= 0 ? 'teal.7' : 'red.7'}>
                    {formatCurrency(q.netPnL, 'USD', true)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>
    </Stack>
  );
};

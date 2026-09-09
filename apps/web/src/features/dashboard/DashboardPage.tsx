import React, { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  SimpleGrid,
  Button,
  Progress,
  Alert,
  Table,
  Select,
  ThemeIcon,
} from '@mantine/core';
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconCalendar,
  IconPlus,
  IconChecklist,
  IconAlertCircle,
  IconTarget,
  IconChartBar,
  IconReceipt,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiClient } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import {
  formatCurrency,
  formatR,
  formatPercentage,
  formatDate,
  getOutcomeBadge,
  getDailyGradeColor,
} from '../../lib/formatters.js';

interface DashboardPageProps {
  onOpenTradePlan?: () => void;
  onOpenRecordExecution?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenTradePlan,
  onOpenRecordExecution,
}) => {
  const navigate = useNavigate();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('acc-demo-50k');
  const [dateRange, setDateRange] = useState<string>('month');

  // Queries
  const { data: accounts = [] } = useQuery({
    queryKey: queryKeys.accounts.list(),
    queryFn: () => apiClient.accounts.list(),
  });

  const { data: summary } = useQuery({
    queryKey: queryKeys.analytics.summary({ accountId: selectedAccountId }),
    queryFn: () => apiClient.analytics.getSummary({ accountId: selectedAccountId }),
  });

  const { data: todayJournal } = useQuery({
    queryKey: queryKeys.journals.byDate(dayjs().format('YYYY-MM-DD')),
    queryFn: () => apiClient.journals.getByDate(dayjs().format('YYYY-MM-DD')),
  });

  const { data: tradesResponse } = useQuery({
    queryKey: queryKeys.trades.list({ accountId: selectedAccountId }),
    queryFn: () => apiClient.trades.list({ accountId: selectedAccountId, pageSize: 5 }),
  });

  const recentTrades = tradesResponse?.items || [];
  const pendingReviewTrades = recentTrades.filter((t: any) => t.state === 'CLOSED' && !t.reviewedAt);

  const goalProgress = summary?.validationGoalTrades
    ? Math.min(100, Math.round(((summary.reviewedTradesCount || 0) / summary.validationGoalTrades) * 100))
    : 3;

  return (
    <Stack gap="lg">
      {/* Top Bar / Header */}
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Group justify="space-between" wrap="wrap" gap="md">
          <div>
            <Title order={2} style={{ color: '#1e293b', fontWeight: 700 }}>
              Performance & Execution Dashboard
            </Title>
            <Text c="dimmed" size="sm">
              Disciplined multi-timeframe trade journal & statistical edge validation
            </Text>
          </div>

          <Group gap="sm">
            <Select
              size="sm"
              label=""
              placeholder="Select Account"
              data={accounts.map((a: any) => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
              value={selectedAccountId}
              onChange={(val) => val && setSelectedAccountId(val)}
              style={{ minWidth: 220 }}
            />
            <Button
              variant="light"
              color="indigo"
              size="sm"
              leftSection={<IconCalendar size={16} />}
              onClick={() => navigate(`/journals/${dayjs().format('YYYY-MM-DD')}`)}
            >
              Today's Journal
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
          </Group>
        </Group>
      </Paper>

      {/* Pending Reviews Alert Banner */}
      {pendingReviewTrades.length > 0 && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          title="Pending Trade Reviews"
          color="orange"
          variant="light"
          radius="md"
        >
          <Group justify="space-between" align="center">
            <Text size="sm">
              You have {pendingReviewTrades.length} closed trade(s) awaiting post-trade review. Complete
              reviews to update discipline analytics.
            </Text>
            <Button
              size="xs"
              variant="outline"
              color="orange"
              onClick={() => navigate(`/trades/${pendingReviewTrades[0].id}`)}
            >
              Review Trade
            </Button>
          </Group>
        </Alert>
      )}

      {/* Today Readiness & 100-Trade Goal Progress */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700} size="sm" c="slate.8">
              Today's Trading Readiness
            </Text>
            <Badge
              variant="light"
              color={todayJournal?.status === 'REVIEWED' ? 'teal' : todayJournal?.status === 'ACTIVE' ? 'blue' : 'gray'}
            >
              {todayJournal?.status || 'NOT INITIALIZED'}
            </Badge>
          </Group>

          <Text size="xs" c="dimmed" mb="md">
            Mental state, sleep quality, and top-down preparation context
          </Text>

          <SimpleGrid cols={3} spacing="xs">
            <Paper p="xs" withBorder radius="sm" style={{ textAlign: 'center' }}>
              <Text size="xs" c="dimmed">
                Sleep Quality
              </Text>
              <Text fw={700} size="md" c="indigo.7">
                {todayJournal?.sleepQuality ? `${todayJournal.sleepQuality}/10` : '—'}
              </Text>
            </Paper>
            <Paper p="xs" withBorder radius="sm" style={{ textAlign: 'center' }}>
              <Text size="xs" c="dimmed">
                Focus Rating
              </Text>
              <Text fw={700} size="md" c="indigo.7">
                {todayJournal?.focusRating ? `${todayJournal.focusRating}/10` : '—'}
              </Text>
            </Paper>
            <Paper p="xs" withBorder radius="sm" style={{ textAlign: 'center' }}>
              <Text size="xs" c="dimmed">
                Stress Level
              </Text>
              <Text fw={700} size="md" c="teal.7">
                {todayJournal?.stressRating ? `${todayJournal.stressRating}/10` : '—'}
              </Text>
            </Paper>
          </SimpleGrid>

          <Group justify="space-between" mt="md">
            <Text size="xs" c="dimmed">
              State: <strong style={{ color: '#1e293b' }}>{todayJournal?.emotionalState || 'Not logged'}</strong>
            </Text>
            <Button
              variant="subtle"
              color="indigo"
              size="xs"
              onClick={() => navigate(`/journals/${dayjs().format('YYYY-MM-DD')}`)}
            >
              Update Readiness &rarr;
            </Button>
          </Group>
        </Card>

        {/* 100-Trade Validation Goal Card */}
        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" mb="xs">
            <Text fw={700} size="sm" c="slate.8">
              Playbook Statistical Validation Goal
            </Text>
            <Badge variant="outline" color="indigo">
              {summary?.reviewedTradesCount || 3} / {summary?.validationGoalTrades || 100} Trades
            </Badge>
          </Group>

          <Text size="xs" c="dimmed" mb="sm">
            Disciplined execution of 100 reviewed trades under MGC Top-Down Sweep v1
          </Text>

          <Progress value={goalProgress} color="indigo" size="lg" radius="xl" mb="xs" />

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Target: 100 compliant reviewed trades
            </Text>
            <Text size="xs" fw={700} c="indigo.8">
              {goalProgress}% Complete
            </Text>
          </Group>

          <Group gap="xs" mt="md">
            <ThemeIcon size="sm" color="teal" variant="light">
              <IconChecklist size={12} />
            </ThemeIcon>
            <Text size="xs" c="dimmed">
              Sample size is statistically meaningful after 100 reviewed trades.
            </Text>
          </Group>
        </Card>
      </SimpleGrid>

      {/* KPI Stats Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Cumulative Net P/L
          </Text>
          <Text
            fw={700}
            size="xl"
            mt="xs"
            c={parseFloat(summary?.totalNetPnL || '0') >= 0 ? 'teal.7' : 'red.7'}
          >
            {formatCurrency(summary?.totalNetPnL || '0', 'USD', true)}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            After fees ({formatCurrency(summary?.totalFees || '0')})
          </Text>
        </Card>

        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Net Expectancy (Mean R)
          </Text>
          <Text fw={700} size="xl" mt="xs" c="indigo.7">
            {formatR(summary?.meanNetR || '0')}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Risk-adjusted return per trade
          </Text>
        </Card>

        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Win Rate
          </Text>
          <Text fw={700} size="xl" mt="xs" c="slate.8">
            {formatPercentage(summary?.winRate || 0)}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {summary?.winningTrades || 0}W / {summary?.losingTrades || 0}L (inc. BE)
          </Text>
        </Card>

        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Profit Factor
          </Text>
          <Text fw={700} size="xl" mt="xs" c="slate.8">
            {summary?.profitFactor || '—'}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Gross Gains / Gross Losses
          </Text>
        </Card>

        <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Mean Process Score
          </Text>
          <Text fw={700} size="xl" mt="xs" c="teal.7">
            {summary?.processScoreMean ? `${summary.processScoreMean}/10` : '—'}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Execution discipline rating
          </Text>
        </Card>
      </SimpleGrid>

      {/* Recent Trades Table */}
      <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="md" c="slate.8">
              Recent Executions
            </Text>
            <Text size="xs" c="dimmed">
              Latest trades recorded for {accounts.find((a: any) => a.id === selectedAccountId)?.name || 'Account'}
            </Text>
          </div>
          <Button variant="subtle" size="xs" color="indigo" onClick={() => navigate('/trades')}>
            View All Trades &rarr;
          </Button>
        </Group>

        <Table.ScrollContainer minWidth={600}>
          <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date & Time</Table.Th>
                <Table.Th>Contract</Table.Th>
                <Table.Th>Direction</Table.Th>
                <Table.Th>Size</Table.Th>
                <Table.Th>Entry & Exit</Table.Th>
                <Table.Th>Net P/L</Table.Th>
                <Table.Th>Net R</Table.Th>
                <Table.Th>Outcome</Table.Th>
                <Table.Th>Review</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentTrades.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8' }}>
                    No trades recorded yet. Click "Plan Trade" to start.
                  </Table.Td>
                </Table.Tr>
              ) : (
                recentTrades.map((trade: any) => {
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
                      <Table.Td>{formatDate(trade.entryAt || trade.createdAt)}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="indigo">
                          {trade.actualContractSymbol || 'MGC'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={trade.direction === 'LONG' ? 'teal' : 'orange'} variant="filled">
                          {trade.direction}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{trade.quantity} cts</Table.Td>
                      <Table.Td>
                        {trade.actualEntry || trade.plannedEntry} &rarr; {trade.exitPrice || '—'}
                      </Table.Td>
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
                        <Badge color={outcomeBadge.color} variant={outcomeBadge.variant}>
                          {outcomeBadge.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {trade.reviewedAt ? (
                          <Badge color="teal" variant="light">
                            Reviewed
                          </Badge>
                        ) : (
                          <Badge color="yellow" variant="light">
                            Pending
                          </Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
};

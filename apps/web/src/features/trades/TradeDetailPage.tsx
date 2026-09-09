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
  Divider,
  Alert,
  Table,
  Modal,
  TextInput,
  NumberInput,
  Checkbox,
  Textarea,
  Tabs,
  Timeline,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCheck,
  IconAlertTriangle,
  IconCalendar,
  IconArrowLeft,
  IconAdjustments,
  IconReceipt,
  IconClock,
  IconBan,
  IconEdit,
} from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import {
  formatCurrency,
  formatR,
  formatDate,
  formatTime,
  getOutcomeBadge,
} from '../../lib/formatters.js';
import { EvidenceGallery } from './EvidenceGallery.js';

export const TradeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [closeModalOpened, { open: openCloseModal, close: closeCloseModal }] = useDisclosure();
  const [mgmtModalOpened, { open: openMgmtModal, close: closeMgmtModal }] = useDisclosure();
  const [correctModalOpened, { open: openCorrectModal, close: closeCorrectModal }] = useDisclosure();
  const [voidModalOpened, { open: openVoidModal, close: closeVoidModal }] = useDisclosure();

  // Close Trade Form State
  const [exitPrice, setExitPrice] = useState('4445.00');
  const [actualFees, setActualFees] = useState('12.50');
  const [feesConfirmed, setFeesConfirmed] = useState(true);

  // Management Event State
  const [mgmtKind, setMgmtKind] = useState<'STOP_ADJUSTED' | 'TARGET_ADJUSTED'>('STOP_ADJUSTED');
  const [mgmtNewValue, setMgmtNewValue] = useState('4432.00');
  const [mgmtReason, setMgmtReason] = useState('Trailing stop behind 5M higher low');

  // Void & Correction States
  const [voidReason, setVoidReason] = useState('');
  const [correctReason, setCorrectReason] = useState('');
  const [correctExitPrice, setCorrectExitPrice] = useState('');

  // Post-Trade Review Form State
  const [reviewScore, setReviewScore] = useState(10);
  const [disciplineScore, setDisciplineScore] = useState(10);
  const [maePoints, setMaePoints] = useState('0.50');
  const [mfePoints, setMfePoints] = useState('10.50');
  const [isGoodLoss, setIsGoodLoss] = useState(false);
  const [reviewNarrative, setReviewNarrative] = useState('');

  const { data: trade, isLoading } = useQuery({
    queryKey: queryKeys.trades.detail(id || 'none'),
    queryFn: () => (id ? apiClient.trades.getById(id) : null),
    enabled: Boolean(id),
  });

  const closeTradeMutation = useMutation({
    mutationFn: () =>
      apiClient.trades.close(trade.id, {
        expectedVersion: trade.version,
        exitPrice,
        exitAt: new Date().toISOString(),
        actualFees,
        feesConfirmed,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
      closeCloseModal();
    },
  });

  const cancelPlanMutation = useMutation({
    mutationFn: () => apiClient.trades.cancelPlan(trade.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
    },
  });

  const addMgmtEventMutation = useMutation({
    mutationFn: () =>
      apiClient.trades.addManagementEvent(trade.id, {
        kind: mgmtKind as any,
        newValue: mgmtNewValue,
        reason: mgmtReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
      closeMgmtModal();
    },
  });

  const saveReviewMutation = useMutation({
    mutationFn: () =>
      apiClient.trades.review(trade.id, {
        expectedVersion: trade.version,
        review: {
          entryExecutionRating: reviewScore,
          emotionalDisciplineRating: disciplineScore,
          followedPlan: true,
          lessonsLearned: reviewNarrative,
          notes: `MAE: ${maePoints} pts, MFE: ${mfePoints} pts. Good Loss: ${isGoodLoss}`,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  const voidTradeMutation = useMutation({
    mutationFn: () =>
      apiClient.trades.void(trade.id, {
        expectedVersion: trade.version,
        reason: voidReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
      closeVoidModal();
      navigate('/trades');
    },
  });

  if (isLoading || !trade) {
    return (
      <Card withBorder p="xl" style={{ backgroundColor: '#ffffff', textAlign: 'center' }}>
        <Text size="sm" c="dimmed">
          Loading Trade Details...
        </Text>
      </Card>
    );
  }

  const outcomeBadge = getOutcomeBadge(trade.outcome, trade.review?.isGoodLoss, trade.review?.isBadWin);

  return (
    <Stack gap="lg">
      {/* Header Bar */}
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="sm">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
            <div>
              <Group gap="xs" align="center">
                <Title order={2} style={{ color: '#1e293b', fontWeight: 700 }}>
                  Trade Detail: {trade.actualContractSymbol || 'MGC'} {trade.direction}
                </Title>
                <Badge
                  color={trade.direction === 'LONG' ? 'teal' : 'orange'}
                  variant="filled"
                  size="md"
                >
                  {trade.direction}
                </Badge>
                <Badge variant="outline" color="indigo">
                  {trade.state}
                </Badge>
                {trade.outcome && (
                  <Badge color={outcomeBadge.color} variant={outcomeBadge.variant}>
                    {outcomeBadge.label}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                Account: Demo Evaluation 50K • Journal: {formatDate(trade.entryAt || trade.createdAt)}
              </Text>
            </div>
          </Group>

          {/* Action Buttons */}
          <Group gap="xs">
            {trade.state === 'PLANNED' && (
              <>
                <Button
                  color="indigo"
                  size="sm"
                  onClick={() => openCloseModal()}
                >
                  Execute / Open Trade
                </Button>
                <Button
                  variant="outline"
                  color="red"
                  size="sm"
                  loading={cancelPlanMutation.isPending}
                  onClick={() => cancelPlanMutation.mutate()}
                >
                  Cancel Plan
                </Button>
              </>
            )}

            {trade.state === 'OPEN' && (
              <>
                <Button
                  color="teal"
                  size="sm"
                  onClick={openCloseModal}
                >
                  Close Trade Fill
                </Button>
                <Button
                  variant="light"
                  color="indigo"
                  size="sm"
                  onClick={openMgmtModal}
                >
                  Adjust Stop / Target
                </Button>
              </>
            )}

            {trade.state === 'CLOSED' && (
              <>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={openCorrectModal}
                >
                  Correct Record
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={openVoidModal}
                >
                  Void Trade
                </Button>
              </>
            )}
          </Group>
        </Group>
      </Paper>

      {/* Side-by-Side Desktop Layout */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Left Column: Evidence Gallery & Visual Charts */}
        <Stack gap="md">
          <EvidenceGallery tradeId={trade.id} />

          {/* Checklist Snapshot Card */}
          <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Title order={5} mb="sm" c="slate.8">
              Strategy Checklist Snapshot (10 Items)
            </Title>
            <Stack gap="xs">
              {(trade.checklistAnswers?.length > 0
                ? trade.checklistAnswers
                : [
                    { itemKey: 'htf_context', answer: 'PASS', evidenceNote: '4H bullish context' },
                    { itemKey: 'external_target', answer: 'PASS', evidenceNote: '4460 buy-side pool' },
                    { itemKey: 'predefined_location', answer: 'PASS', evidenceNote: '15M demand zone' },
                    { itemKey: 'location_compatible', answer: 'PASS', evidenceNote: 'In discount' },
                    { itemKey: 'approved_timing', answer: 'PASS', evidenceNote: 'NY session Q2' },
                    { itemKey: 'sweep_reclaim', answer: 'PASS', evidenceNote: 'Swept 4430.5 low' },
                    { itemKey: 'displacement_mss', answer: 'PASS', evidenceNote: '5M MSS close' },
                    { itemKey: 'fvg_formation', answer: 'PASS', evidenceNote: '5M clean imbalance' },
                    { itemKey: 'first_valid_retracement', answer: 'PASS', evidenceNote: '1M touch at 4435' },
                    { itemKey: 'structural_risk_reward', answer: 'PASS', evidenceNote: 'Stop 5 pts, TP 10 pts' },
                  ]
              ).map((chk: any) => (
                <Group key={chk.itemKey} justify="space-between">
                  <Text size="xs" fw={500}>
                    {chk.itemKey.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <Group gap="xs">
                    {chk.evidenceNote && (
                      <Text size="xs" c="dimmed">
                        {chk.evidenceNote}
                      </Text>
                    )}
                    <Badge color={chk.answer === 'PASS' ? 'teal' : 'red'} size="xs">
                      {chk.answer}
                    </Badge>
                  </Group>
                </Group>
              ))}
            </Stack>
          </Card>
        </Stack>

        {/* Right Column: Execution Metrics, Management, and Review */}
        <Stack gap="md">
          {/* Financial Breakdown Card */}
          <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Title order={5} mb="sm" c="slate.8">
              Execution & Financial Breakdown
            </Title>

            <SimpleGrid cols={2} spacing="xs" mb="md">
              <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: '#f8fafc' }}>
                <Text size="xs" c="dimmed">
                  Actual Entry
                </Text>
                <Text fw={700} size="md">
                  {trade.actualEntry || trade.plannedEntry}
                </Text>
              </Paper>
              <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: '#f8fafc' }}>
                <Text size="xs" c="dimmed">
                  Actual Exit
                </Text>
                <Text fw={700} size="md">
                  {trade.exitPrice || '— (Active / Open)'}
                </Text>
              </Paper>
              <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: '#f8fafc' }}>
                <Text size="xs" c="dimmed">
                  Original Stop Loss
                </Text>
                <Text fw={700} size="md">
                  {trade.originalStop} ({trade.stopPoints || '5.0'} pts)
                </Text>
              </Paper>
              <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: '#f8fafc' }}>
                <Text size="xs" c="dimmed">
                  Original Target
                </Text>
                <Text fw={700} size="md">
                  {trade.originalTarget} ({trade.plannedRR || '2.0'} R:R)
                </Text>
              </Paper>
            </SimpleGrid>

            <SimpleGrid cols={3} spacing="xs">
              <Paper p="xs" withBorder radius="sm">
                <Text size="xs" c="dimmed">
                  Initial Risk
                </Text>
                <Text fw={700} size="md" c="indigo.8">
                  {formatCurrency(trade.riskAmount || '250.00')}
                </Text>
              </Paper>
              <Paper p="xs" withBorder radius="sm">
                <Text size="xs" c="dimmed">
                  Realized Net P/L
                </Text>
                <Text
                  fw={700}
                  size="md"
                  c={
                    trade.netPnL === null
                      ? 'gray'
                      : parseFloat(trade.netPnL) >= 0
                      ? 'teal.7'
                      : 'red.7'
                  }
                >
                  {trade.netPnL ? formatCurrency(trade.netPnL, 'USD', true) : 'Provisional'}
                </Text>
              </Paper>
              <Paper p="xs" withBorder radius="sm">
                <Text size="xs" c="dimmed">
                  Realized Net R
                </Text>
                <Text fw={700} size="md" c="indigo.7">
                  {trade.netR ? formatR(trade.netR) : '—'}
                </Text>
              </Paper>
            </SimpleGrid>

            <Group justify="space-between" mt="md">
              <Text size="xs" c="dimmed">
                Round-Trip Fees: <strong>{formatCurrency(trade.actualFees || '12.50')}</strong>{' '}
                {trade.feesConfirmed ? '(Confirmed)' : '(Unconfirmed)'}
              </Text>
              <Text size="xs" c="dimmed">
                Contracts: <strong>{trade.quantity} cts</strong>
              </Text>
            </Group>
          </Card>

          {/* Management Events Timeline */}
          <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Group justify="space-between" mb="xs">
              <Title order={5} c="slate.8">
                Trade Management Events
              </Title>
              {trade.state === 'OPEN' && (
                <Button size="xs" variant="subtle" color="indigo" onClick={openMgmtModal}>
                  + Add Adjustment
                </Button>
              )}
            </Group>

            {trade.managementEvents?.length === 0 ? (
              <Text size="xs" c="dimmed">
                No stop adjustments or management events recorded. Original stop respected.
              </Text>
            ) : (
              <Timeline active={trade.managementEvents?.length || 1} bulletSize={18} lineWidth={2}>
                {(trade.managementEvents || []).map((me: any) => (
                  <Timeline.Item key={me.id} title={me.kind.replace(/_/g, ' ')}>
                    <Text size="xs" c="dimmed">
                      {me.oldValue} &rarr; <strong>{me.newValue}</strong>
                    </Text>
                    <Text size="xs" mt={2}>
                      {me.reason || 'Management adjustment'}
                    </Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Card>

          {/* Post-Trade Review Card */}
          <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Group justify="space-between" mb="sm">
              <Title order={5} c="slate.8">
                Post-Trade Review & Lessons
              </Title>
              {trade.reviewedAt && (
                <Badge color="teal" variant="light">
                  Reviewed on {formatDate(trade.reviewedAt)}
                </Badge>
              )}
            </Group>

            <SimpleGrid cols={2} spacing="xs" mb="sm">
              <NumberInput
                label="Execution Quality (1 - 10)"
                min={1}
                max={10}
                value={reviewScore}
                onChange={(val) => setReviewScore(Number(val) || 10)}
              />
              <NumberInput
                label="Discipline Rating (1 - 10)"
                min={1}
                max={10}
                value={disciplineScore}
                onChange={(val) => setDisciplineScore(Number(val) || 10)}
              />
            </SimpleGrid>

            <SimpleGrid cols={2} spacing="xs" mb="sm">
              <TextInput
                label="Observed MAE (Adverse Pts)"
                value={maePoints}
                onChange={(e) => setMaePoints(e.currentTarget.value)}
              />
              <TextInput
                label="Observed MFE (Favorable Pts)"
                value={mfePoints}
                onChange={(e) => setMfePoints(e.currentTarget.value)}
              />
            </SimpleGrid>

            <Checkbox
              label="Flag as Good Loss (Disciplined execution respecting stop loss)"
              checked={isGoodLoss}
              onChange={(e) => setIsGoodLoss(e.target.checked)}
              mb="sm"
            />

            <Textarea
              label="Review Narrative & Key Takeaways"
              placeholder="Reflect on execution, emotional composure, and adherence to MGC rules..."
              minRows={3}
              value={reviewNarrative || trade.review?.narrative || ''}
              onChange={(e) => setReviewNarrative(e.target.value)}
              mb="md"
            />

            <Group justify="flex-end">
              <Button
                color="indigo"
                size="sm"
                loading={saveReviewMutation.isPending}
                onClick={() => saveReviewMutation.mutate()}
              >
                Save Trade Review
              </Button>
            </Group>
          </Card>
        </Stack>
      </SimpleGrid>

      {/* Close Trade Modal */}
      <Modal opened={closeModalOpened} onClose={closeCloseModal} title="Record Trade Exit Fill" centered>
        <Stack gap="sm">
          <TextInput
            label="Exit Price"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Total Round-Trip Fees ($)"
            value={actualFees}
            onChange={(e) => setActualFees(e.currentTarget.value)}
          />
          <Checkbox
            label="Confirm final fees from broker statement"
            checked={feesConfirmed}
            onChange={(e) => setFeesConfirmed(e.target.checked)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeCloseModal}>
              Cancel
            </Button>
            <Button
              color="teal"
              loading={closeTradeMutation.isPending}
              onClick={() => closeTradeMutation.mutate()}
            >
              Confirm Exit Fill
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Management Event Modal */}
      <Modal opened={mgmtModalOpened} onClose={closeMgmtModal} title="Adjust Stop or Target" centered>
        <Stack gap="sm">
          <TextInput
            label="New Price Level"
            value={mgmtNewValue}
            onChange={(e) => setMgmtNewValue(e.currentTarget.value)}
          />
          <TextInput
            label="Management Reason"
            placeholder="e.g. Trailing stop to breakeven after Q2 expansion"
            value={mgmtReason}
            onChange={(e) => setMgmtReason(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeMgmtModal}>
              Cancel
            </Button>
            <Button
              color="indigo"
              loading={addMgmtEventMutation.isPending}
              onClick={() => addMgmtEventMutation.mutate()}
            >
              Record Adjustment
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Void Trade Modal */}
      <Modal opened={voidModalOpened} onClose={closeVoidModal} title="Void Accidental Duplicate Trade" centered>
        <Stack gap="sm">
          <Alert color="red" title="Audit Void Action">
            Voiding excludes this trade from analytics while preserving an audit trail. Requires mandatory reason.
          </Alert>
          <TextInput
            label="Reason for Voiding"
            placeholder="e.g. Accidental duplicate entry from testing"
            value={voidReason}
            onChange={(e) => setVoidReason(e.currentTarget.value)}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeVoidModal}>
              Cancel
            </Button>
            <Button
              color="red"
              disabled={!voidReason.trim()}
              loading={voidTradeMutation.isPending}
              onClick={() => voidTradeMutation.mutate()}
            >
              Confirm Void
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

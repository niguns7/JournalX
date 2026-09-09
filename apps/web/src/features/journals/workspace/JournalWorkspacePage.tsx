import React, { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Button,
  Tabs,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Checkbox,
  SimpleGrid,
  Divider,
  Alert,
  Table,
  Modal,
  Loader,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconPlus,
  IconCalendarEvent,
  IconChartCandle,
  IconArrowsExchange,
  IconNotebook,
  IconShieldCheck,
  IconHistory,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { formatDate, getDailyGradeColor, formatCurrency, formatR } from '../../../lib/formatters.js';
import { useAutosave } from '../../../lib/hooks/useAutosave.js';

interface JournalWorkspacePageProps {
  onOpenTradePlan?: (journalId: string) => void;
  onOpenRecordExecution?: (journalId: string) => void;
  initialTab?: string;
}

export const JournalWorkspacePage: React.FC<JournalWorkspacePageProps> = ({
  onOpenTradePlan,
  onOpenRecordExecution,
  initialTab = 'prep',
}) => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const journalDate = date || new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<string | null>(initialTab);
  const [eventModalOpened, { open: openEventModal, close: closeEventModal }] = useDisclosure();
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('08:30');
  const [newEventImpact, setNewEventImpact] = useState<any>('HIGH');
  const [newEventNotes, setNewEventNotes] = useState('');

  // Main Journal Query
  const {
    data: journal,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.journals.byDate(journalDate),
    queryFn: () => apiClient.journals.getByDate(journalDate),
  });

  // Windows, Events, Analyses, Scenarios Queries
  const { data: windows = [] } = useQuery({
    queryKey: queryKeys.journals.windows(journal?.id || 'none'),
    queryFn: () => (journal?.id ? apiClient.journals.windows.list(journal.id) : []),
    enabled: Boolean(journal?.id),
  });

  const { data: events = [] } = useQuery({
    queryKey: queryKeys.journals.events(journal?.id || 'none'),
    queryFn: () => (journal?.id ? apiClient.journals.events.list(journal.id) : []),
    enabled: Boolean(journal?.id),
  });

  const { data: analyses = [] } = useQuery({
    queryKey: queryKeys.journals.analyses(journal?.id || 'none'),
    queryFn: () => (journal?.id ? apiClient.journals.analyses.list(journal.id) : []),
    enabled: Boolean(journal?.id),
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: queryKeys.journals.scenarios(journal?.id || 'none'),
    queryFn: () => (journal?.id ? apiClient.journals.scenarios.list(journal.id) : []),
    enabled: Boolean(journal?.id),
  });

  const { data: tradesResponse } = useQuery({
    queryKey: queryKeys.trades.list({ journalId: journal?.id }),
    queryFn: () =>
      journal?.id
        ? apiClient.trades.list({ journalId: journal.id })
        : Promise.resolve({ items: [] as any[], page: 1, pageSize: 20, total: 0 }),
    enabled: Boolean(journal?.id),
  });

  const trades = tradesResponse?.items || [];

  // Local form state for autosave
  const [formData, setFormData] = useState({
    sleepQuality: 8,
    focusRating: 8,
    stressRating: 3,
    emotionalState: 'Calm',
    preparationNotes: '',
    readiness: {
      physicalScore: 8,
      mentalScore: 8,
      checklistComplete: true,
      newsChecked: true,
      riskAcknowledged: true,
    },
    // Top-down narratives
    narrative4H: '',
    narrative1H: '',
    narrative15M: '',
    // Reflection & EOD
    reflection: {
      marketSummary: '',
      whatWentWell: '',
      mistakesOrFrictions: '',
      challengingConditions: '',
      whatToRepeat: '',
      tomorrowCorrection: '',
      strategyVsPnlReflection: '',
      finalLesson: '',
    },
    processEvaluation: {
      analysisBeforeExecution: true,
      predefinedLocationRespected: true,
      liquidityEventConfirmed: true,
      displacementConfirmed: true,
      retracementEntryUsed: true,
      correctPositionSizing: true,
      respectedStopLoss: true,
      respectedTradeLimit: true,
      noRevengeTrading: true,
      honestJournalingCompleted: true,
    },
    gradeOverride: null as string | null,
    gradeOverrideReason: '',
  });

  // Sync loaded journal to state
  useEffect(() => {
    if (journal) {
      setFormData((prev) => ({
        ...prev,
        sleepQuality: journal.sleepQuality ?? 8,
        focusRating: journal.focusRating ?? 8,
        stressRating: journal.stressRating ?? 3,
        emotionalState: journal.emotionalState || 'Calm',
        preparationNotes: journal.preparationNotes || '',
        readiness: journal.readiness || prev.readiness,
        reflection: journal.reflection || prev.reflection,
        processEvaluation: journal.processEvaluation || prev.processEvaluation,
        gradeOverride: journal.gradeOverride || null,
        gradeOverrideReason: journal.gradeOverrideReason || '',
      }));
    }
  }, [journal]);

  // Autosave hook
  const { status: autosaveStatus, errorMessage: autosaveError, retry: retryAutosave } = useAutosave({
    data: formData,
    enabled: Boolean(journal?.id && journal.status !== 'REVIEWED'),
    onSave: async (dataToSave) => {
      if (!journal?.id) return;
      await apiClient.journals.update(journal.id, {
        expectedVersion: journal.version,
        sleepQuality: dataToSave.sleepQuality,
        focusRating: dataToSave.focusRating,
        stressRating: dataToSave.stressRating,
        emotionalState: dataToSave.emotionalState,
        preparationNotes: dataToSave.preparationNotes,
        readiness: dataToSave.readiness as any,
        reflection: dataToSave.reflection as any,
        processEvaluation: dataToSave.processEvaluation as any,
        gradeOverride: dataToSave.gradeOverride as any,
        gradeOverrideReason: dataToSave.gradeOverrideReason,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.byDate(journalDate) });
    },
  });

  // Mutations
  const activateMutation = useMutation({
    mutationFn: () => apiClient.journals.activate(journal.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.byDate(journalDate) });
    },
  });

  const completeReviewMutation = useMutation({
    mutationFn: () =>
      apiClient.journals.completeReview(journal.id, {
        expectedVersion: journal.version,
        reflection: formData.reflection as any,
        processEvaluation: formData.processEvaluation as any,
        gradeOverride: formData.gradeOverride as any,
        gradeOverrideReason: formData.gradeOverrideReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.byDate(journalDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => apiClient.journals.reopen(journal.id, { reason: 'Editing review post-market' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.byDate(journalDate) });
    },
  });

  const addEventMutation = useMutation({
    mutationFn: () =>
      apiClient.journals.events.create(journal.id, {
        title: newEventTitle,
        occursAt: `${journalDate}T${newEventTime}:00-04:00`,
        impact: newEventImpact,
        notes: newEventNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.events(journal.id) });
      closeEventModal();
      setNewEventTitle('');
      setNewEventNotes('');
    },
  });

  if (isLoading) {
    return (
      <Card withBorder p="xl" style={{ textAlign: 'center', backgroundColor: '#ffffff' }}>
        <Loader color="indigo" size="lg" />
        <Text mt="md" size="sm" c="dimmed">
          Loading Daily Journal for {journalDate}...
        </Text>
      </Card>
    );
  }

  // Calculate process score (0-10)
  const processKeys = [
    'analysisBeforeExecution',
    'predefinedLocationRespected',
    'liquidityEventConfirmed',
    'displacementConfirmed',
    'retracementEntryUsed',
    'correctPositionSizing',
    'respectedStopLoss',
    'respectedTradeLimit',
    'noRevengeTrading',
    'honestJournalingCompleted',
  ];
  const passedCount = processKeys.filter(
    (k) => (formData.processEvaluation as any)?.[k] === true,
  ).length;
  const calculatedScore = passedCount;
  const calculatedGrade = calculatedScore >= 9 ? 'A' : calculatedScore >= 7 ? 'B' : calculatedScore >= 5 ? 'C' : 'D';

  return (
    <Stack gap="lg">
      {/* Workspace Header */}
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Group justify="space-between" wrap="wrap" gap="md">
          <div>
            <Group gap="xs" align="center">
              <Title order={2} style={{ color: '#1e293b', fontWeight: 700 }}>
                Daily Journal: {formatDate(journalDate)}
              </Title>
              <Badge
                variant={journal?.status === 'REVIEWED' ? 'filled' : 'light'}
                color={
                  journal?.status === 'REVIEWED'
                    ? 'teal'
                    : journal?.status === 'ACTIVE'
                    ? 'indigo'
                    : 'gray'
                }
                size="md"
              >
                {journal?.status || 'DRAFT'}
              </Badge>
              {journal?.calculatedGrade && (
                <Badge
                  color={getDailyGradeColor(journal.gradeOverride || journal.calculatedGrade)}
                  variant="filled"
                >
                  Grade {journal.gradeOverride || journal.calculatedGrade}
                </Badge>
              )}
            </Group>
            <Text c="dimmed" size="xs" mt={4}>
              Timezone Boundary: {journal?.timezoneSnapshot || 'Asia/Kathmandu'} • Version: {journal?.version || 1}
            </Text>
          </div>

          <Group gap="sm" align="center">
            {/* Autosave Status Indicator */}
            {autosaveStatus === 'saving' && (
              <Badge variant="light" color="blue" leftSection={<Loader size={10} color="blue" />}>
                Saving...
              </Badge>
            )}
            {autosaveStatus === 'saved' && (
              <Badge variant="light" color="teal" leftSection={<IconCheck size={12} />}>
                Saved
              </Badge>
            )}
            {autosaveStatus === 'error' && (
              <Group gap="xs">
                <Badge variant="filled" color="red">
                  Save Error
                </Badge>
                <Button size="xs" variant="outline" color="red" onClick={retryAutosave}>
                  Retry
                </Button>
              </Group>
            )}
            {autosaveStatus === 'conflict' && (
              <Badge variant="filled" color="orange" leftSection={<IconAlertTriangle size={12} />}>
                409 Version Conflict
              </Badge>
            )}

            {/* Lifecycle Action Buttons */}
            {journal?.status === 'DRAFT' && (
              <Button
                color="indigo"
                size="sm"
                loading={activateMutation.isPending}
                onClick={() => activateMutation.mutate()}
              >
                Activate Trading Day
              </Button>
            )}

            {journal?.status === 'ACTIVE' && (
              <Button
                color="teal"
                size="sm"
                loading={completeReviewMutation.isPending}
                onClick={() => completeReviewMutation.mutate()}
              >
                Complete EOD Review
              </Button>
            )}

            {journal?.status === 'REVIEWED' && (
              <Button
                variant="outline"
                color="indigo"
                size="sm"
                leftSection={<IconHistory size={16} />}
                loading={reopenMutation.isPending}
                onClick={() => reopenMutation.mutate()}
              >
                Reopen Review
              </Button>
            )}
          </Group>
        </Group>

        {/* Conflict Guidance Banner */}
        {autosaveStatus === 'conflict' && (
          <Alert
            icon={<IconAlertTriangle size={18} />}
            title="Version Conflict Detected"
            color="orange"
            variant="light"
            mt="md"
          >
            Another tab or session updated this journal. Your local changes are preserved in the form.
            Review your text and click Save/Complete Review to overwrite with your latest version.
          </Alert>
        )}
      </Paper>

      {/* Main Workspace Navigation Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab} color="indigo" variant="outline" radius="md">
        <Tabs.List style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '4px' }}>
          <Tabs.Tab value="prep" leftSection={<IconShieldCheck size={16} />}>
            1. Preparation & Readiness
          </Tabs.Tab>
          <Tabs.Tab value="calendar" leftSection={<IconCalendarEvent size={16} />}>
            2. Economic Calendar ({events.length})
          </Tabs.Tab>
          <Tabs.Tab value="topdown" leftSection={<IconChartCandle size={16} />}>
            3. Top-Down Analysis (4H/1H/15M)
          </Tabs.Tab>
          <Tabs.Tab value="scenarios" leftSection={<IconArrowsExchange size={16} />}>
            4. Scenarios & Windows ({scenarios.length})
          </Tabs.Tab>
          <Tabs.Tab value="trades" leftSection={<IconNotebook size={16} />}>
            5. Trades ({trades.length})
          </Tabs.Tab>
          <Tabs.Tab value="review" leftSection={<IconCheck size={16} />}>
            6. End-of-Day Review
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Preparation & Mental State */}
        <Tabs.Panel value="prep" pt="md">
          <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Title order={4} mb="md" c="slate.8">
              Pre-Market Preparation & Psychological Readiness
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
              <NumberInput
                label="Sleep Quality (1 - 10)"
                description="Rest and recovery rating"
                min={1}
                max={10}
                value={formData.sleepQuality}
                onChange={(val) => setFormData((p) => ({ ...p, sleepQuality: Number(val) || 8 }))}
              />
              <NumberInput
                label="Focus Rating (1 - 10)"
                description="Mental clarity and presence"
                min={1}
                max={10}
                value={formData.focusRating}
                onChange={(val) => setFormData((p) => ({ ...p, focusRating: Number(val) || 8 }))}
              />
              <NumberInput
                label="Stress Rating (1 - 10)"
                description="Lower is calmer"
                min={1}
                max={10}
                value={formData.stressRating}
                onChange={(val) => setFormData((p) => ({ ...p, stressRating: Number(val) || 3 }))}
              />
            </SimpleGrid>

            <TextInput
              label="Emotional State / Mindset"
              placeholder="e.g. Calm, Patient, Non-reactive"
              value={formData.emotionalState}
              onChange={(e) => setFormData((p) => ({ ...p, emotionalState: e.target.value }))}
              mb="md"
            />

            <Textarea
              label="Preparation & Context Notes"
              placeholder="Top-down context overview before trading session begins..."
              minRows={4}
              value={formData.preparationNotes}
              onChange={(e) => setFormData((p) => ({ ...p, preparationNotes: e.target.value }))}
              mb="lg"
            />

            <Divider my="md" label="Pre-Flight Readiness Check" labelPosition="center" />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Checkbox
                label="Physical & mental energy verified adequate"
                checked={formData.readiness.physicalScore >= 7}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    readiness: { ...p.readiness, physicalScore: e.target.checked ? 8 : 4 },
                  }))
                }
              />
              <Checkbox
                label="Economic news calendar and high-impact releases checked"
                checked={formData.readiness.newsChecked}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    readiness: { ...p.readiness, newsChecked: e.target.checked },
                  }))
                }
              />
              <Checkbox
                label="Max daily loss ($500) and consecutive loss limit (2) acknowledged"
                checked={formData.readiness.riskAcknowledged}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    readiness: { ...p.readiness, riskAcknowledged: e.target.checked },
                  }))
                }
              />
              <Checkbox
                label="Preparation complete before trading window opening"
                checked={formData.readiness.checklistComplete}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    readiness: { ...p.readiness, checklistComplete: e.target.checked },
                  }))
                }
              />
            </SimpleGrid>
          </Card>
        </Tabs.Panel>

        {/* Tab 2: Economic Calendar */}
        <Tabs.Panel value="calendar" pt="md">
          <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Group justify="space-between" mb="md">
              <div>
                <Title order={4} c="slate.8">
                  Economic Calendar & Volatility Restrictions
                </Title>
                <Text size="xs" c="dimmed">
                  High impact releases require strict trading restriction windows (e.g. 5 min before to 15 min after).
                </Text>
              </div>
              <Button
                size="xs"
                color="indigo"
                leftSection={<IconPlus size={14} />}
                onClick={openEventModal}
              >
                Add News Event
              </Button>
            </Group>

            <Table verticalSpacing="sm" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Time</Table.Th>
                  <Table.Th>Event Title</Table.Th>
                  <Table.Th>Impact</Table.Th>
                  <Table.Th>Restriction Window</Table.Th>
                  <Table.Th>Notes</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {events.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>
                      No economic events scheduled for today.
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  events.map((evt: any) => (
                    <Table.Tr key={evt.id}>
                      <Table.Td fw={600}>
                        {evt.occursAt ? new Date(evt.occursAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </Table.Td>
                      <Table.Td fw={500}>{evt.title}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            evt.impact === 'HIGH' ? 'red' : evt.impact === 'MEDIUM' ? 'orange' : 'gray'
                          }
                          variant="filled"
                        >
                          {evt.impact}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {evt.restrictionStart && evt.restrictionEnd ? (
                          <Badge color="red" variant="outline">
                            No Trade: {new Date(evt.restrictionStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(evt.restrictionEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Badge>
                        ) : (
                          'None'
                        )}
                      </Table.Td>
                      <Table.Td>{evt.notes || '—'}</Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        {/* Tab 3: Top-Down Multi-Timeframe Analysis */}
        <Tabs.Panel value="topdown" pt="md">
          <Stack gap="md">
            {/* 4H Analysis */}
            <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Badge color="indigo" size="lg" variant="filled">
                  4H Context & Dealing Range
                </Badge>
                <Badge color="teal" variant="light">
                  Discount Zone (4420 - 4460)
                </Badge>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" my="sm">
                <TextInput label="Dealing Range High" value="4460.00" readOnly />
                <TextInput label="Equilibrium (50%)" value="4440.00" readOnly />
                <TextInput label="Dealing Range Low" value="4420.00" readOnly />
              </SimpleGrid>

              <Textarea
                label="4H Structure & Liquidity Narrative"
                placeholder="4H market structure, dealing range equilibrium, liquidity objectives..."
                minRows={3}
                value={
                  formData.narrative4H ||
                  '4H Dealing range between 4420 (Low) and 4460 (High). Equilibrium at 4440. Trading in discount looking for expansion toward 4460 liquidity pool.'
                }
                onChange={(e) => setFormData((p) => ({ ...p, narrative4H: e.target.value }))}
              />
            </Card>

            {/* 1H Analysis */}
            <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Badge color="indigo" size="lg" variant="filled">
                  1H Directional Bias
                </Badge>
                <Badge color="blue" variant="light">
                  Conditional Bullish &gt; 4430
                </Badge>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" my="sm">
                <TextInput label="Protected Swing Low" value="4425.00" readOnly />
                <TextInput label="External Buy Liquidity" value="4460.00" readOnly />
              </SimpleGrid>

              <Textarea
                label="1H Bias & Key Invalidation Level"
                placeholder="1H bias conditions, protected high/low, FVG notes..."
                minRows={3}
                value={
                  formData.narrative1H ||
                  'Conditional Bullish Bias confirmed above 4430. Protected swing low at 4425. Target 4455-4460 buy-side liquidity.'
                }
                onChange={(e) => setFormData((p) => ({ ...p, narrative1H: e.target.value }))}
              />
            </Card>

            {/* 15M Analysis & Key Zones */}
            <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
              <Group justify="space-between" mb="xs">
                <Badge color="indigo" size="lg" variant="filled">
                  15M Predefined Execution Locations
                </Badge>
                <Badge color="teal" variant="light">
                  Primary Zone: 4432 - 4435
                </Badge>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" my="sm">
                <TextInput label="Preferred Long Zone" value="4432.00 - 4435.00" readOnly />
                <TextInput label="No-Trade Range" value="4438.00 - 4443.00 (Chop)" readOnly />
              </SimpleGrid>

              <Textarea
                label="15M Reaction & Intended Trigger"
                placeholder="Anticipated reaction, sweep of Asian low, 5M MSS requirements..."
                minRows={3}
                value={
                  formData.narrative15M ||
                  'Key 15M discount demand zone between 4432-4435. Look for 5M sweep of Asian low at 4430.5 followed by reclaim and 1M FVG entry.'
                }
                onChange={(e) => setFormData((p) => ({ ...p, narrative15M: e.target.value }))}
              />
            </Card>
          </Stack>
        </Tabs.Panel>

        {/* Tab 4: Scenarios & Windows */}
        <Tabs.Panel value="scenarios" pt="md">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {scenarios.map((scen: any) => (
              <Card key={scen.id} withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
                <Group justify="space-between" mb="xs">
                  <Badge
                    color={
                      scen.kind === 'LONG' ? 'teal' : scen.kind === 'SHORT' ? 'orange' : 'gray'
                    }
                    variant="filled"
                    size="md"
                  >
                    {scen.kind} SCENARIO
                  </Badge>
                  <Text size="xs" c="dimmed">
                    Trigger: {scen.conditions?.triggerZone || 'Defined'}
                  </Text>
                </Group>
                <Text size="sm" mt="xs" style={{ color: '#1e293b' }}>
                  {scen.narrative}
                </Text>
                {scen.conditions?.target && (
                  <Group justify="space-between" mt="md">
                    <Text size="xs" c="dimmed">
                      Target: <strong>{scen.conditions.target}</strong>
                    </Text>
                    <Text size="xs" c="red.7">
                      Invalidation: <strong>{scen.conditions.invalidation || '—'}</strong>
                    </Text>
                  </Group>
                )}
              </Card>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        {/* Tab 5: Trades */}
        <Tabs.Panel value="trades" pt="md">
          <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Group justify="space-between" mb="md">
              <div>
                <Title order={4} c="slate.8">
                  Trades for {formatDate(journalDate)}
                </Title>
                <Text size="xs" c="dimmed">
                  Execution log for the active journal day
                </Text>
              </div>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  color="indigo"
                  onClick={() => onOpenTradePlan?.(journal?.id)}
                >
                  Plan Trade
                </Button>
                <Button
                  size="xs"
                  variant="filled"
                  color="indigo"
                  onClick={() => onOpenRecordExecution?.(journal?.id)}
                >
                  Record Execution
                </Button>
              </Group>
            </Group>

            <Table verticalSpacing="sm" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Contract</Table.Th>
                  <Table.Th>Direction</Table.Th>
                  <Table.Th>Size</Table.Th>
                  <Table.Th>Entry & Exit</Table.Th>
                  <Table.Th>Net P/L</Table.Th>
                  <Table.Th>Net R</Table.Th>
                  <Table.Th>Outcome</Table.Th>
                  <Table.Th>State</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {trades.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8' }}>
                      No trades recorded for this day yet.
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  trades.map((t: any) => (
                    <Table.Tr
                      key={t.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/trades/${t.id}`)}
                    >
                      <Table.Td fw={600}>{t.actualContractSymbol || 'MGC'}</Table.Td>
                      <Table.Td>
                        <Badge color={t.direction === 'LONG' ? 'teal' : 'orange'}>
                          {t.direction}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{t.quantity} cts</Table.Td>
                      <Table.Td>
                        {t.actualEntry || t.plannedEntry} &rarr; {t.exitPrice || '—'}
                      </Table.Td>
                      <Table.Td fw={700}>
                        {t.netPnL ? formatCurrency(t.netPnL, 'USD', true) : 'Provisional'}
                      </Table.Td>
                      <Table.Td fw={700} c="indigo.7">
                        {t.netR ? formatR(t.netR) : '—'}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={t.outcome === 'WIN' ? 'teal' : t.outcome === 'LOSS' ? 'red' : 'gray'}>
                          {t.outcome || 'PENDING'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="outline" color="indigo">
                          {t.state}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        {/* Tab 6: End-of-Day Review */}
        <Tabs.Panel value="review" pt="md">
          <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Title order={4} mb="xs" c="slate.8">
              End-of-Day Process Assessment & Reflection
            </Title>
            <Text size="xs" c="dimmed" mb="lg">
              Evaluate execution discipline against your 10 trading commandments.
            </Text>

            {/* Score & Grade Display */}
            <Paper p="md" withBorder radius="md" mb="lg" style={{ backgroundColor: '#f8fafc' }}>
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                    Process Discipline Score
                  </Text>
                  <Title order={2} c="indigo.8">
                    {calculatedScore} / 10 Points
                  </Title>
                  <Text size="xs" c="dimmed">
                    Calculated Grade: <strong>Grade {calculatedGrade}</strong>
                  </Text>
                </div>
                <div>
                  <Badge
                    color={getDailyGradeColor(formData.gradeOverride || calculatedGrade)}
                    size="xl"
                    variant="filled"
                  >
                    Grade {formData.gradeOverride || calculatedGrade}
                  </Badge>
                </div>
              </Group>
            </Paper>

            {/* 10 Process Checklist Items */}
            <Title order={5} mb="sm" c="slate.8">
              Process Evaluation Checklist (10 Items)
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mb="lg">
              <Checkbox
                label="1. Top-down analysis completed before execution"
                checked={formData.processEvaluation.analysisBeforeExecution}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    processEvaluation: {
                      ...p.processEvaluation,
                      analysisBeforeExecution: e.target.checked,
                    },
                  }))
                }
              />
              <Checkbox
                label="2. Executed strictly at predefined 15M location"
                checked={formData.processEvaluation.predefinedLocationRespected}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    processEvaluation: {
                      ...p.processEvaluation,
                      predefinedLocationRespected: e.target.checked,
                    },
                  }))
                }
              />
              <Checkbox
                label="3. Waited for 5M liquidity sweep confirmation"
                checked={formData.processEvaluation.liquidityEventConfirmed}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    processEvaluation: {
                      ...p.processEvaluation,
                      liquidityEventConfirmed: e.target.checked,
                    },
                  }))
                }
              />
              <Checkbox
                label="4. 5M displacement & MSS body close confirmed"
                checked={formData.processEvaluation.displacementConfirmed}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    processEvaluation: {
                      ...p.processEvaluation,
                      displacementConfirmed: e.target.checked,
                    },
                  }))
                }
              />
              <Checkbox
                label="5. Entered on 1M first retracement into FVG"
                checked={formData.processEvaluation.retracementEntryUsed}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    processEvaluation: {
                      ...p.processEvaluation,
                      retracementEntryUsed: e.target.checked,
                    },
                  }))
                }
              />
              <Checkbox
                label="6. Correct position size within risk budget"
                checked={formData.processEvaluation.correctPositionSizing}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    processEvaluation: {
                      ...p.processEvaluation,
                      correctPositionSizing: e.target.checked,
                    },
                  }))
                }
              />
              <Checkbox
                label="7. Respected structural stop loss (no widening)"
                checked={formData.processEvaluation.respectedStopLoss}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    processEvaluation: {
                      ...p.processEvaluation,
                      respectedStopLoss: e.target.checked,
                    },
                  }))
                }
              />
              <Checkbox
                label="8. Respected daily trade limit (max 3 trades)"
                checked={formData.processEvaluation.respectedTradeLimit}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    processEvaluation: {
                      ...p.processEvaluation,
                      respectedTradeLimit: e.target.checked,
                    },
                  }))
                }
              />
              <Checkbox
                label="9. No revenge trading or emotional entries"
                checked={formData.processEvaluation.noRevengeTrading}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    processEvaluation: {
                      ...p.processEvaluation,
                      noRevengeTrading: e.target.checked,
                    },
                  }))
                }
              />
              <Checkbox
                label="10. Honest and complete journaling completed"
                checked={formData.processEvaluation.honestJournalingCompleted}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    processEvaluation: {
                      ...p.processEvaluation,
                      honestJournalingCompleted: e.target.checked,
                    },
                  }))
                }
              />
            </SimpleGrid>

            {/* Manual Grade Override */}
            <Divider my="md" label="Manual Grade Override (Optional)" labelPosition="center" />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="lg">
              <Select
                label="Grade Override"
                placeholder="Keep calculated grade"
                clearable
                data={[
                  { value: 'A', label: 'Grade A' },
                  { value: 'B', label: 'Grade B' },
                  { value: 'C', label: 'Grade C' },
                  { value: 'D', label: 'Grade D' },
                ]}
                value={formData.gradeOverride}
                onChange={(val) => setFormData((p) => ({ ...p, gradeOverride: val }))}
              />
              <TextInput
                label="Override Justification Reason"
                placeholder="Required if manually overriding calculated grade"
                value={formData.gradeOverrideReason}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, gradeOverrideReason: e.target.value }))
                }
              />
            </SimpleGrid>

            {/* Reflection Questions */}
            <Title order={5} mb="sm" c="slate.8">
              Post-Session Reflection
            </Title>
            <Stack gap="sm">
              <Textarea
                label="What did the market do today?"
                placeholder="Market behavior, key session expansions..."
                value={formData.reflection.marketSummary}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    reflection: { ...p.reflection, marketSummary: e.target.value },
                  }))
                }
              />
              <Textarea
                label="What went well?"
                placeholder="Disciplined behaviors, patience, good exits..."
                value={formData.reflection.whatWentWell}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    reflection: { ...p.reflection, whatWentWell: e.target.value },
                  }))
                }
              />
              <Textarea
                label="One clear correction for tomorrow"
                placeholder="Focus item for the next trading session..."
                value={formData.reflection.tomorrowCorrection}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    reflection: { ...p.reflection, tomorrowCorrection: e.target.value },
                  }))
                }
              />
              <Textarea
                label="Strategy execution vs P/L reflection"
                placeholder="Were wins disciplined? Were losses good losses?"
                value={formData.reflection.strategyVsPnlReflection}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    reflection: { ...p.reflection, strategyVsPnlReflection: e.target.value },
                  }))
                }
              />
            </Stack>

            <Group justify="flex-end" mt="xl">
              <Button
                color="teal"
                size="md"
                loading={completeReviewMutation.isPending}
                onClick={() => completeReviewMutation.mutate()}
              >
                Complete & Finalize Review
              </Button>
            </Group>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Add Event Modal */}
      <Modal opened={eventModalOpened} onClose={closeEventModal} title="Add Economic Calendar Event" centered>
        <Stack gap="sm">
          <TextInput
            label="Event Title"
            placeholder="e.g. US Non-Farm Payrolls"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Time (EST)"
            placeholder="08:30"
            value={newEventTime}
            onChange={(e) => setNewEventTime(e.currentTarget.value)}
          />
          <Select
            label="Impact Level"
            data={[
              { value: 'HIGH', label: 'HIGH (Red)' },
              { value: 'MEDIUM', label: 'MEDIUM (Orange)' },
              { value: 'LOW', label: 'LOW (Gray)' },
            ]}
            value={newEventImpact}
            onChange={(val) => setNewEventImpact(val)}
          />
          <TextInput
            label="Notes"
            placeholder="Volatility expectations..."
            value={newEventNotes}
            onChange={(e) => setNewEventNotes(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeEventModal}>
              Cancel
            </Button>
            <Button
              color="indigo"
              loading={addEventMutation.isPending}
              onClick={() => addEventMutation.mutate()}
            >
              Add Event
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

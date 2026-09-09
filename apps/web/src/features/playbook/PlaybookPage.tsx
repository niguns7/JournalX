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
  Textarea,
  Timeline,
  Tabs,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconNotebook,
  IconChecklist,
  IconShield,
  IconHistory,
  IconPlus,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { formatDate } from '../../lib/formatters.js';

export const PlaybookPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [draftModalOpened, { open: openDraftModal, close: closeDraftModal }] = useDisclosure();
  const [publishModalOpened, { open: openPublishModal, close: closePublishModal }] = useDisclosure();

  const { data: strategies = [] } = useQuery({
    queryKey: queryKeys.strategies.list(),
    queryFn: () => apiClient.strategies.list(),
  });

  const strategy = strategies[0] || {
    id: 'strat-mgc-v1',
    name: 'MGC Top-Down Sweep Confirmation v1',
    description: 'Disciplined multi-timeframe liquidity sweep confirmation model for Micro Gold.',
    currentPublishedVersion: {
      versionNumber: 1,
      status: 'PUBLISHED',
      narrative:
        'Sequence: 4H Context -> 1H Conditional Bias -> 15M Location -> 5M Sweep/Reclaim -> 5M Displacement & MSS -> FVG -> 1M First Retracement -> Structural Target.',
      rules: {
        maxContracts: 5,
        maxStructuralStopPoints: '5.000000',
        minPlannedRR: '2.000000',
        consecutiveLossLimit: 2,
      },
      checklist: {
        items: [
          { key: 'htf_context', label: 'Higher-Timeframe Context', timeframe: '4H' },
          { key: 'external_target', label: 'External Liquidity Target', timeframe: '1H' },
          { key: 'predefined_location', label: 'Predefined Location', timeframe: '15M' },
          { key: 'location_compatible', label: 'Location Compatible with Bias', timeframe: '15M' },
          { key: 'approved_timing', label: 'Approved Session Timing Window', timeframe: '15M' },
          { key: 'sweep_reclaim', label: 'Liquidity Sweep & Reclaim', timeframe: '5M' },
          { key: 'displacement_mss', label: 'Displacement + MSS Close', timeframe: '5M' },
          { key: 'fvg_formation', label: 'Fair Value Gap (FVG)', timeframe: '5M' },
          { key: 'first_valid_retracement', label: 'First Valid 1M Retracement', timeframe: '1M' },
          { key: 'structural_risk_reward', label: 'Structural R:R >= 2.0', timeframe: '1M' },
        ],
      },
      publishedAt: '2026-09-01T00:00:00.000Z',
    },
  };

  const publishMutation = useMutation({
    mutationFn: () => apiClient.strategies.publishVersion(strategy.id, 'sver-mgc-v2'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies.all });
      closePublishModal();
    },
  });

  return (
    <Stack gap="lg">
      {/* Header Bar */}
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Group justify="space-between" wrap="wrap" gap="md">
          <div>
            <Group gap="xs" align="center">
              <Title order={2} style={{ color: '#1e293b', fontWeight: 700 }}>
                {strategy.name}
              </Title>
              <Badge color="teal" variant="filled" size="md">
                PUBLISHED v{strategy.currentPublishedVersion?.versionNumber || 1}
              </Badge>
            </Group>
            <Text c="dimmed" size="sm" mt={4}>
              {strategy.description}
            </Text>
          </div>

          <Group gap="xs">
            <Button
              variant="outline"
              color="indigo"
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={openDraftModal}
            >
              Create Draft Version
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Version Immutability Notice */}
      <Alert
        icon={<IconShield size={18} />}
        color="indigo"
        variant="light"
        title="Strategy Version Immutability Notice"
        radius="md"
      >
        Published strategy versions and their mandatory checklist gates are immutable. Historical
        trades remain permanently bound to the rules under which they were executed.
      </Alert>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Left Column: Multi-Timeframe Execution Sequence */}
        <Stack gap="md">
          <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Title order={5} mb="sm" c="slate.8">
              Multi-Timeframe Execution Sequence
            </Title>
            <Timeline active={6} bulletSize={24} lineWidth={2}>
              <Timeline.Item bullet={<Text size="xs">4H</Text>} title="4H Dealing Range Context">
                <Text size="xs" c="dimmed">
                  Determine dealing range high/low, equilibrium (50%), and whether price is in discount or premium.
                </Text>
              </Timeline.Item>

              <Timeline.Item bullet={<Text size="xs">1H</Text>} title="1H Directional Bias & Invalidation">
                <Text size="xs" c="dimmed">
                  Confirm conditional bias above/below key protected swings and identify resting liquidity pools.
                </Text>
              </Timeline.Item>

              <Timeline.Item bullet={<Text size="xs">15M</Text>} title="15M Predefined Key Zones">
                <Text size="xs" c="dimmed">
                  Identify high-probability order blocks / FVGs. Never enter outside predefined locations.
                </Text>
              </Timeline.Item>

              <Timeline.Item bullet={<Text size="xs">5M</Text>} title="5M Liquidity Sweep & Displacement">
                <Text size="xs" c="dimmed">
                  Watch for sweep of external session liquidity followed by energetic body close (MSS).
                </Text>
              </Timeline.Item>

              <Timeline.Item bullet={<Text size="xs">1M</Text>} title="1M First Valid Retracement Entry">
                <Text size="xs" c="dimmed">
                  Enter on the first test into the newly created 1M/5M Fair Value Gap.
                </Text>
              </Timeline.Item>

              <Timeline.Item bullet={<Text size="xs">TP</Text>} title="Structural Invalidation & Target">
                <Text size="xs" c="dimmed">
                  Stop behind protected invalidation swing. Minimum planned R:R of 2.0 to external target.
                </Text>
              </Timeline.Item>
            </Timeline>
          </Card>

          {/* Hard Risk Constraints */}
          <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Title order={5} mb="sm" c="slate.8">
              Hard Risk & Position Size Constraints
            </Title>
            <SimpleGrid cols={2} spacing="xs">
              <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: '#f8fafc' }}>
                <Text size="xs" c="dimmed">
                  Max Position Size
                </Text>
                <Text fw={700} size="md">
                  5 Contracts (Personal rule)
                </Text>
              </Paper>
              <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: '#f8fafc' }}>
                <Text size="xs" c="dimmed">
                  Max Structural Stop
                </Text>
                <Text fw={700} size="md">
                  5.0 Points ($250 price risk)
                </Text>
              </Paper>
              <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: '#f8fafc' }}>
                <Text size="xs" c="dimmed">
                  Min Planned R:R
                </Text>
                <Text fw={700} size="md">
                  2.0 : 1
                </Text>
              </Paper>
              <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: '#f8fafc' }}>
                <Text size="xs" c="dimmed">
                  Consecutive Loss Stop
                </Text>
                <Text fw={700} size="md">
                  2 Losses (Day stop)
                </Text>
              </Paper>
            </SimpleGrid>
          </Card>
        </Stack>

        {/* Right Column: 10 Mandatory Checklist Items & Version History */}
        <Stack gap="md">
          <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Title order={5} mb="sm" c="slate.8">
              10 Mandatory Strategy Conditions (10/10 Required)
            </Title>
            <Text size="xs" c="dimmed" mb="md">
              Every item is mandatory for plan eligibility. A high score never overrides a missing condition.
            </Text>

            <Stack gap="xs">
              {(strategy.currentPublishedVersion?.checklist?.items || []).map(
                (item: any, idx: number) => (
                  <Paper
                    key={item.key}
                    p="xs"
                    withBorder
                    radius="sm"
                    style={{ backgroundColor: '#f8fafc' }}
                  >
                    <Group justify="space-between">
                      <div>
                        <Text size="xs" fw={700}>
                          {idx + 1}. {item.label}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Timeframe: {item.timeframe}
                        </Text>
                      </div>
                      <Badge color="indigo" size="xs" variant="light">
                        MANDATORY
                      </Badge>
                    </Group>
                  </Paper>
                ),
              )}
            </Stack>
          </Card>

          {/* Version History Timeline */}
          <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Title order={5} mb="sm" c="slate.8">
              Strategy Version History
            </Title>
            <Timeline active={1} bulletSize={18} lineWidth={2}>
              <Timeline.Item title="Version 1 (Published)">
                <Text size="xs" c="dimmed">
                  Published on {formatDate(strategy.currentPublishedVersion?.publishedAt)}
                </Text>
                <Text size="xs" mt={2}>
                  Initial 10/10 mandatory checklist sweep confirmation model.
                </Text>
              </Timeline.Item>
            </Timeline>
          </Card>
        </Stack>
      </SimpleGrid>

      {/* Create Draft Modal */}
      <Modal opened={draftModalOpened} onClose={closeDraftModal} title="Create Strategy Draft v2" centered>
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            Creating a draft allows iterating on rules and checklist without altering the currently published v1 strategy.
          </Text>
          <TextInput label="Draft Version Title" defaultValue="MGC Top-Down Sweep Confirmation v2 (Draft)" />
          <Textarea
            label="Version Notes / Proposed Refinements"
            placeholder="e.g. Adding tighter 15M volume confluence..."
            minRows={3}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeDraftModal}>
              Cancel
            </Button>
            <Button
              color="indigo"
              onClick={() => {
                closeDraftModal();
              }}
            >
              Create Draft
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

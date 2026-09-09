import React, { useState } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Select,
  SegmentedControl,
  Button,
  Group,
  Text,
  Paper,
  SimpleGrid,
  Checkbox,
  Badge,
  Alert,
  Title,
  Divider,
} from '@mantine/core';
import { IconCheck, IconAlertCircle, IconCalculator } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TradeDirection, ChecklistAnswer } from '@journalx/domain';
import { apiClient } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { formatCurrency, formatR } from '../../lib/formatters.js';

interface TradePlanModalProps {
  opened: boolean;
  onClose: () => void;
  journalId?: string;
  onSuccess?: (trade: any) => void;
}

export const TradePlanModal: React.FC<TradePlanModalProps> = ({
  opened,
  onClose,
  journalId = 'jour-today',
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: queryKeys.accounts.list(),
    queryFn: () => apiClient.accounts.list(),
  });

  const { data: instruments = [] } = useQuery({
    queryKey: queryKeys.instruments.list(),
    queryFn: () => apiClient.instruments.list(),
  });

  const { data: strategies = [] } = useQuery({
    queryKey: queryKeys.strategies.list(),
    queryFn: () => apiClient.strategies.list(),
  });

  const [accountId, setAccountId] = useState('acc-demo-50k');
  const [instrumentId, setInstrumentId] = useState('inst-mgc');
  const [strategyVersionId, setStrategyVersionId] = useState('sver-mgc-v1');
  const [direction, setDirection] = useState<TradeDirection>(TradeDirection.LONG);
  const [plannedEntry, setPlannedEntry] = useState('4435.00');
  const [originalStop, setOriginalStop] = useState('4430.00');
  const [originalTarget, setOriginalTarget] = useState('4445.00');
  const [quantity, setQuantity] = useState(5);
  const [contractSymbol, setContractSymbol] = useState('MGCM6');

  // 10 Mandatory Checklist Answers
  const [checklist, setChecklist] = useState<Record<string, ChecklistAnswer>>({
    htf_context: ChecklistAnswer.PASS,
    external_target: ChecklistAnswer.PASS,
    predefined_location: ChecklistAnswer.PASS,
    location_compatible: ChecklistAnswer.PASS,
    approved_timing: ChecklistAnswer.PASS,
    sweep_reclaim: ChecklistAnswer.PASS,
    displacement_mss: ChecklistAnswer.PASS,
    fvg_formation: ChecklistAnswer.PASS,
    first_valid_retracement: ChecklistAnswer.PASS,
    structural_risk_reward: ChecklistAnswer.PASS,
  });

  const checklistItems = [
    { key: 'htf_context', label: '1. Higher-Timeframe Context (4H/1H structure aligned)' },
    { key: 'external_target', label: '2. External Liquidity Target (resting pool clear)' },
    { key: 'predefined_location', label: '3. Predefined 15M Location / Key Zone' },
    { key: 'location_compatible', label: '4. Location Compatible with Bias (Discount/Premium)' },
    { key: 'approved_timing', label: '5. Approved Session Timing Window (London / NY)' },
    { key: 'sweep_reclaim', label: '6. 5M Liquidity Sweep & Reclaim Close' },
    { key: 'displacement_mss', label: '7. 5M Displacement + MSS Close' },
    { key: 'fvg_formation', label: '8. 5M Fair Value Gap Formed' },
    { key: 'first_valid_retracement', label: '9. First Valid 1M Retracement Touch' },
    { key: 'structural_risk_reward', label: '10. Structural R:R >= 2.0 & Invalidation Protected' },
  ];

  // Client calculations for live preview
  const entryNum = parseFloat(plannedEntry) || 0;
  const stopNum = parseFloat(originalStop) || 0;
  const targetNum = parseFloat(originalTarget) || 0;
  const pointValue = 10; // MGC
  const stopPoints = Math.abs(entryNum - stopNum);
  const initialRisk = stopPoints * quantity * pointValue;
  const plannedReward = Math.abs(targetNum - entryNum) * quantity * pointValue;
  const plannedRR = initialRisk > 0 ? plannedReward / initialRisk : 0;

  const allMandatoryPassed = Object.values(checklist).every((ans) => ans === 'PASS');
  const isEligible = allMandatoryPassed && plannedRR >= 2.0 && stopPoints <= 5.0 && quantity <= 5;

  const createPlanMutation = useMutation({
    mutationFn: () =>
      apiClient.trades.createPlan({
        journalId,
        accountId,
        instrumentId,
        strategyVersionId,
        direction,
        plannedEntry,
        originalStop,
        originalTarget,
        quantity,
        actualContractSymbol: contractSymbol,
        checklistAnswers: Object.entries(checklist).map(([itemKey, answer]) => ({
          itemKey,
          answer,
        })),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
      onSuccess?.(data);
      onClose();
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Plan New Trade — MGC Top-Down Sweep Strategy"
      size="lg"
      centered
      transitionProps={{ duration: 0 }}
    >
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select
            label="Trading Account"
            data={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
            value={accountId}
            onChange={(val) => val && setAccountId(val)}
          />
          <TextInput
            label="Traded Contract Symbol"
            value={contractSymbol}
            onChange={(e) => setContractSymbol(e.currentTarget.value)}
          />
        </SimpleGrid>

        <SegmentedControl
          fullWidth
          value={direction}
          onChange={(val: any) => setDirection(val)}
          data={[
            { label: '🟢 LONG', value: 'LONG' },
            { label: '🔴 SHORT', value: 'SHORT' },
          ]}
          color={direction === 'LONG' ? 'teal' : 'red'}
        />

        <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="sm">
          <TextInput
            label="Planned Entry"
            value={plannedEntry}
            onChange={(e) => setPlannedEntry(e.currentTarget.value)}
          />
          <TextInput
            label="Original Stop"
            value={originalStop}
            onChange={(e) => setOriginalStop(e.currentTarget.value)}
          />
          <TextInput
            label="Original Target"
            value={originalTarget}
            onChange={(e) => setOriginalTarget(e.currentTarget.value)}
          />
          <NumberInput
            label="Contracts"
            min={1}
            max={5}
            value={quantity}
            onChange={(val) => setQuantity(Number(val) || 1)}
          />
        </SimpleGrid>

        {/* Live Risk & RR Preview Card */}
        <Paper p="sm" withBorder radius="md" style={{ backgroundColor: '#f8fafc' }}>
          <Group justify="space-between" align="center">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Planned Gross Price Risk
              </Text>
              <Text fw={700} size="lg" c="indigo.8">
                {formatCurrency(initialRisk)} ({stopPoints.toFixed(1)} pts)
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Planned Reward
              </Text>
              <Text fw={700} size="lg" c="teal.7">
                {formatCurrency(plannedReward)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Planned R:R
              </Text>
              <Text fw={700} size="lg" c={plannedRR >= 2 ? 'teal.7' : 'orange.7'}>
                {plannedRR.toFixed(2)} : 1
              </Text>
            </div>
          </Group>
        </Paper>

        <Divider my="xs" label="10 Mandatory Strategy Checklist Items" labelPosition="center" />

        <Stack gap="xs">
          {checklistItems.map((item) => (
            <Checkbox
              key={item.key}
              label={item.label}
              checked={checklist[item.key] === ChecklistAnswer.PASS}
              onChange={(e) =>
                setChecklist((p) => ({
                  ...p,
                  [item.key]: e.target.checked ? ChecklistAnswer.PASS : ChecklistAnswer.FAIL,
                }))
              }
            />
          ))}
        </Stack>

        {/* Rule Engine Eligibility Status */}
        {isEligible ? (
          <Alert icon={<IconCheck size={18} />} color="teal" variant="light" title="Plan Eligible">
            All 10 mandatory playbook conditions satisfied. Risk & R:R meet strategy constraints.
          </Alert>
        ) : (
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="orange"
            variant="light"
            title="Plan Ineligible"
          >
            Requires 10/10 mandatory conditions (10/10 required), stop &le; 5.0 pts, and planned R:R &ge; 2.0.
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="indigo"
            loading={createPlanMutation.isPending}
            disabled={!isEligible}
            onClick={() => createPlanMutation.mutate()}
          >
            Save Trade Plan
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

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
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TradeDirection } from '@journalx/domain';
import { apiClient } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';

interface TradeRecordExecutionModalProps {
  opened: boolean;
  onClose: () => void;
  journalId?: string;
  onSuccess?: (trade: any) => void;
}

export const TradeRecordExecutionModal: React.FC<TradeRecordExecutionModalProps> = ({
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

  const [accountId, setAccountId] = useState('acc-demo-50k');
  const [instrumentId, setInstrumentId] = useState('inst-mgc');
  const [strategyVersionId, setStrategyVersionId] = useState('sver-mgc-v1');
  const [direction, setDirection] = useState<TradeDirection>(TradeDirection.LONG);
  const [contractSymbol, setContractSymbol] = useState('MGCM6');
  const [actualEntry, setActualEntry] = useState('4435.00');
  const [originalStop, setOriginalStop] = useState('4430.00');
  const [originalTarget, setOriginalTarget] = useState('4445.00');
  const [quantity, setQuantity] = useState(5);
  const [entryTime, setEntryTime] = useState('10:08');

  // Closed trade fields
  const [isClosed, setIsClosed] = useState(true);
  const [exitPrice, setExitPrice] = useState('4445.00');
  const [exitTime, setExitTime] = useState('10:28');
  const [actualFees, setActualFees] = useState('12.50');
  const [feesConfirmed, setFeesConfirmed] = useState(true);

  // Compliance & Violation Acknowledgment
  const [hasViolations, setHasViolations] = useState(false);
  const [acknowledgeViolations, setAcknowledgeViolations] = useState(false);
  const [violationReason, setViolationReason] = useState('');

  const recordExecutionMutation = useMutation({
    mutationFn: () =>
      apiClient.trades.recordExecution({
        journalId,
        accountId,
        instrumentId,
        strategyVersionId,
        direction,
        actualEntry,
        originalStop,
        originalTarget,
        quantity,
        entryAt: `${new Date().toISOString().split('T')[0]}T${entryTime}:00-04:00`,
        actualContractSymbol: contractSymbol,
        exitPrice: isClosed ? exitPrice : undefined,
        exitAt: isClosed ? `${new Date().toISOString().split('T')[0]}T${exitTime}:00-04:00` : undefined,
        actualFees: isClosed ? actualFees : undefined,
        feesConfirmed: isClosed ? feesConfirmed : undefined,
        acknowledgeViolations: hasViolations ? acknowledgeViolations : false,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      onSuccess?.(data);
      onClose();
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Record Executed Trade (Actual Fill)"
      size="lg"
      centered
      transitionProps={{ duration: 0 }}
    >
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          Record an actual market execution. Note: Single entry fill and single exit fill model (v1
          integer contracts, no scaling).
        </Text>

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
            label="Actual Entry Price"
            value={actualEntry}
            onChange={(e) => setActualEntry(e.currentTarget.value)}
          />
          <TextInput
            label="Original Stop Price"
            value={originalStop}
            onChange={(e) => setOriginalStop(e.currentTarget.value)}
          />
          <TextInput
            label="Original Target Price"
            value={originalTarget}
            onChange={(e) => setOriginalTarget(e.currentTarget.value)}
          />
          <NumberInput
            label="Contracts"
            min={1}
            max={10}
            value={quantity}
            onChange={(val) => setQuantity(Number(val) || 1)}
          />
        </SimpleGrid>

        <Divider my="xs" label="Trade Lifecycle Status" labelPosition="center" />

        <Checkbox
          label="Trade is already closed (Record final exit fill and fees)"
          checked={isClosed}
          onChange={(e) => setIsClosed(e.target.checked)}
        />

        {isClosed && (
          <Paper p="sm" withBorder radius="md" style={{ backgroundColor: '#f8fafc' }}>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <TextInput
                label="Exit Price"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.currentTarget.value)}
              />
              <TextInput
                label="Total Round-Trip Fees ($)"
                value={actualFees}
                onChange={(e) => setActualFees(e.currentTarget.value)}
              />
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
                <Checkbox
                  label="Fees Confirmed"
                  checked={feesConfirmed}
                  onChange={(e) => setFeesConfirmed(e.target.checked)}
                />
              </div>
            </SimpleGrid>
            {!feesConfirmed && (
              <Text size="xs" c="orange.7" mt="xs">
                ⚠️ Without confirmed fees, Net P/L & Net R will remain provisional.
              </Text>
            )}
          </Paper>
        )}

        <Divider my="xs" label="Compliance & Non-Compliant Logging" labelPosition="center" />

        <Checkbox
          label="Flag this execution as having rule violations (e.g. FOMO, early entry, oversized)"
          checked={hasViolations}
          onChange={(e) => setHasViolations(e.target.checked)}
        />

        {hasViolations && (
          <Alert
            icon={<IconAlertTriangle size={18} />}
            color="orange"
            variant="light"
            title="Non-Compliant Actual Trade Acknowledgment"
          >
            <Stack gap="xs">
              <Text size="xs">
                JournalX never blocks logging actual trades. Please acknowledge the violation to maintain
                honest statistics.
              </Text>
              <TextInput
                label="Reason for Non-Compliant Entry"
                placeholder="e.g. Executed before 5M MSS body close"
                value={violationReason}
                onChange={(e) => setViolationReason(e.currentTarget.value)}
              />
              <Checkbox
                label="I acknowledge this trade violated playbook rules"
                checked={acknowledgeViolations}
                onChange={(e) => setAcknowledgeViolations(e.target.checked)}
              />
            </Stack>
          </Alert>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="indigo"
            loading={recordExecutionMutation.isPending}
            disabled={hasViolations && !acknowledgeViolations}
            onClick={() => recordExecutionMutation.mutate()}
          >
            Record Actual Execution
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

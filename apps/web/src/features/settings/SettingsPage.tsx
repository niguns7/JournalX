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
  TextInput,
  Table,
  Modal,
  Tabs,
  Alert,
  Code,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSettings,
  IconBuildingBank,
  IconCoins,
  IconDatabase,
  IconPlus,
  IconCheck,
  IconClock,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountStatus, AccountType } from '@journalx/domain';
import { apiClient } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { formatCurrency, formatDate } from '../../lib/formatters.js';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [accountModalOpened, { open: openAccountModal, close: closeAccountModal }] = useDisclosure();
  const [instModalOpened, { open: openInstModal, close: closeInstModal }] = useDisclosure();

  // Settings query
  const { data: settings } = useQuery({
    queryKey: queryKeys.settings(),
    queryFn: () => apiClient.settings.get(),
  });

  // Accounts query
  const { data: accounts = [] } = useQuery({
    queryKey: queryKeys.accounts.list(),
    queryFn: () => apiClient.accounts.list(),
  });

  // Instruments query
  const { data: instruments = [] } = useQuery({
    queryKey: queryKeys.instruments.list(),
    queryFn: () => apiClient.instruments.list(),
  });

  // Local state for app settings
  const [journalTz, setJournalTz] = useState('Asia/Kathmandu');
  const [displayTz, setDisplayTz] = useState('Asia/Kathmandu');
  const [defaultAcc, setDefaultAcc] = useState('acc-demo-50k');

  // Account creation state
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<any>('EVALUATION');
  const [newAccNominal, setNewAccNominal] = useState('50000.00');
  const [newAccRiskBasis, setNewAccRiskBasis] = useState('2000.00');

  // Instrument creation state
  const [newInstSymbol, setNewInstSymbol] = useState('');
  const [newInstName, setNewInstName] = useState('');
  const [newInstTick, setNewInstTick] = useState('0.100000');
  const [newInstPointVal, setNewInstPointVal] = useState('10.000000');

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      apiClient.settings.update({
        journalTimezone: journalTz,
        displayTimezone: displayTz,
        defaultAccountId: defaultAcc,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings() });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: () =>
      apiClient.accounts.create({
        name: newAccName,
        type: newAccType,
        currency: 'USD',
        nominalSize: newAccNominal,
        riskBasisAmount: newAccRiskBasis,
        status: AccountStatus.ACTIVE,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      closeAccountModal();
      setNewAccName('');
    },
  });

  const createInstrumentMutation = useMutation({
    mutationFn: () =>
      apiClient.instruments.create({
        symbol: newInstSymbol,
        displayName: newInstName,
        tickSize: newInstTick,
        pointValue: newInstPointVal,
        currency: 'USD',
        verifiedSource: 'CME Official Specifications',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instruments.all });
      closeInstModal();
      setNewInstSymbol('');
      setNewInstName('');
    },
  });

  return (
    <Stack gap="lg">
      {/* Header */}
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Group justify="space-between" wrap="wrap" gap="md">
          <div>
            <Title order={2} style={{ color: '#1e293b', fontWeight: 700 }}>
              System Preferences & Settings
            </Title>
            <Text c="dimmed" size="sm">
              Manage timezones, trading accounts, contract multiplier specifications, and database backups
            </Text>
          </div>
        </Group>
      </Paper>

      <Tabs defaultValue="app" color="indigo" variant="outline" radius="md">
        <Tabs.List style={{ backgroundColor: '#ffffff', padding: '4px', borderRadius: '8px' }}>
          <Tabs.Tab value="app" leftSection={<IconSettings size={16} />}>
            General & Timezones
          </Tabs.Tab>
          <Tabs.Tab value="accounts" leftSection={<IconBuildingBank size={16} />}>
            Trading Accounts ({accounts.length})
          </Tabs.Tab>
          <Tabs.Tab value="instruments" leftSection={<IconCoins size={16} />}>
            Instruments & Multipliers ({instruments.length})
          </Tabs.Tab>
          <Tabs.Tab value="backup" leftSection={<IconDatabase size={16} />}>
            Backup & Recovery
          </Tabs.Tab>
        </Tabs.List>

        {/* General Preferences */}
        <Tabs.Panel value="app" pt="md">
          <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Title order={4} mb="md" c="slate.8">
              Journal & Display Timezones
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="lg">
              <Select
                label="Primary Journal Timezone Boundary"
                description="Calendar day boundaries are computed in this IANA timezone"
                data={[
                  { value: 'Asia/Kathmandu', label: 'Asia/Kathmandu (NPT, UTC+5:45)' },
                  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
                  { value: 'UTC', label: 'UTC' },
                ]}
                value={journalTz}
                onChange={(val) => val && setJournalTz(val)}
              />

              <Select
                label="Display Timezone"
                description="Timezone used for timestamps throughout charts and logs"
                data={[
                  { value: 'Asia/Kathmandu', label: 'Asia/Kathmandu (NPT, UTC+5:45)' },
                  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
                  { value: 'UTC', label: 'UTC' },
                ]}
                value={displayTz}
                onChange={(val) => val && setDisplayTz(val)}
              />
            </SimpleGrid>

            <Select
              label="Default Active Trading Account"
              data={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
              value={defaultAcc}
              onChange={(val) => val && setDefaultAcc(val)}
              mb="xl"
            />

            <Group justify="flex-end">
              <Button
                color="indigo"
                loading={updateSettingsMutation.isPending}
                onClick={() => updateSettingsMutation.mutate()}
              >
                Save Preferences
              </Button>
            </Group>
          </Card>
        </Tabs.Panel>

        {/* Trading Accounts */}
        <Tabs.Panel value="accounts" pt="md">
          <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Group justify="space-between" mb="md">
              <div>
                <Title order={4} c="slate.8">
                  Trading Accounts
                </Title>
                <Text size="xs" c="dimmed">
                  Manage evaluation, live funded, and paper trading accounts.
                </Text>
              </div>
              <Button
                size="xs"
                color="indigo"
                leftSection={<IconPlus size={14} />}
                onClick={openAccountModal}
              >
                Add Account
              </Button>
            </Group>

            <Table verticalSpacing="sm" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Nominal Size</Table.Th>
                  <Table.Th>Risk Basis (Drawdown Headroom)</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Risk Defaults</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {accounts.map((acc: any) => (
                  <Table.Tr key={acc.id}>
                    <Table.Td fw={600}>{acc.name}</Table.Td>
                    <Table.Td>
                      <Badge color="indigo" variant="light">
                        {acc.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatCurrency(acc.nominalSize)}</Table.Td>
                    <Table.Td fw={700} c="indigo.8">
                      {formatCurrency(acc.riskBasisAmount)}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={acc.status === 'ACTIVE' ? 'teal' : 'gray'} variant="filled">
                        {acc.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">
                        Max {acc.riskDefaultsJson?.maxContracts || 5} cts • ${acc.riskDefaultsJson?.maxRiskPerTrade || '250'} max risk
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        {/* Instruments & Multipliers */}
        <Tabs.Panel value="instruments" pt="md">
          <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Group justify="space-between" mb="md">
              <div>
                <Title order={4} c="slate.8">
                  Futures Instruments & Multipliers
                </Title>
                <Text size="xs" c="dimmed">
                  Official contract multipliers and minimum tick size specifications.
                </Text>
              </div>
              <Button
                size="xs"
                color="indigo"
                leftSection={<IconPlus size={14} />}
                onClick={openInstModal}
              >
                Add Instrument
              </Button>
            </Group>

            <Table verticalSpacing="sm" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Symbol</Table.Th>
                  <Table.Th>Display Name</Table.Th>
                  <Table.Th>Tick Size</Table.Th>
                  <Table.Th>Point Value / Contract</Table.Th>
                  <Table.Th>Verified Source</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {instruments.map((inst: any) => (
                  <Table.Tr key={inst.id}>
                    <Table.Td>
                      <Badge color="indigo" size="md">
                        {inst.symbol}
                      </Badge>
                    </Table.Td>
                    <Table.Td fw={600}>{inst.displayName}</Table.Td>
                    <Table.Td>{parseFloat(inst.tickSize).toFixed(2)} pts</Table.Td>
                    <Table.Td fw={700} c="teal.7">
                      ${parseFloat(inst.pointValue).toFixed(2)} / pt
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {inst.verifiedSource || 'Verified CME specs'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        {/* Backup & Recovery */}
        <Tabs.Panel value="backup" pt="md">
          <Card withBorder padding="lg" radius="md" style={{ backgroundColor: '#ffffff' }}>
            <Title order={4} mb="xs" c="slate.8">
              Database Backup & Disaster Recovery Runbook
            </Title>
            <Text size="xs" c="dimmed" mb="md">
              JournalX runs on a local PostgreSQL instance with named persistent volumes. Follow these
              standard commands to create portable snapshots.
            </Text>

            <Stack gap="md">
              <Paper p="md" withBorder radius="md" style={{ backgroundColor: '#f8fafc' }}>
                <Text fw={700} size="sm" mb="xs">
                  1. PostgreSQL Database Dump Command:
                </Text>
                <Code block color="dark">
                  pg_dump -h 127.0.0.1 -p 5442 -U journalx -d journalx_dev -F c -b -v -f journalx_backup.dump
                </Code>
              </Paper>

              <Paper p="md" withBorder radius="md" style={{ backgroundColor: '#f8fafc' }}>
                <Text fw={700} size="sm" mb="xs">
                  2. Restore into Isolated Clean Database:
                </Text>
                <Code block color="dark">
                  pg_restore -h 127.0.0.1 -p 5442 -U journalx -d journalx_restored -v journalx_backup.dump
                </Code>
              </Paper>

              <Alert title="Single-Owner Local Storage" color="indigo" variant="light">
                All data resides on your machine. Attachment files and screenshots are persisted in the
                configured local storage directory.
              </Alert>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Add Account Modal */}
      <Modal opened={accountModalOpened} onClose={closeAccountModal} title="Add Trading Account" centered>
        <Stack gap="sm">
          <TextInput
            label="Account Name"
            placeholder="e.g. Apex 50K Evaluation"
            value={newAccName}
            onChange={(e) => setNewAccName(e.currentTarget.value)}
            required
          />
          <Select
            label="Account Type"
            data={[
              { value: 'EVALUATION', label: 'Evaluation / Prop Firm' },
              { value: 'LIVE', label: 'Live Funded Capital' },
              { value: 'SIMULATED', label: 'Paper / Simulated' },
            ]}
            value={newAccType}
            onChange={(val) => setNewAccType(val)}
          />
          <SimpleGrid cols={2} spacing="xs">
            <TextInput
              label="Nominal Size ($)"
              value={newAccNominal}
              onChange={(e) => setNewAccNominal(e.currentTarget.value)}
            />
            <TextInput
              label="Risk Basis / Max Drawdown ($)"
              value={newAccRiskBasis}
              onChange={(e) => setNewAccRiskBasis(e.currentTarget.value)}
            />
          </SimpleGrid>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeAccountModal}>
              Cancel
            </Button>
            <Button
              color="indigo"
              loading={createAccountMutation.isPending}
              onClick={() => createAccountMutation.mutate()}
            >
              Save Account
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Instrument Modal */}
      <Modal opened={instModalOpened} onClose={closeInstModal} title="Add Futures Instrument" centered>
        <Stack gap="sm">
          <TextInput
            label="Symbol"
            placeholder="e.g. MGC"
            value={newInstSymbol}
            onChange={(e) => setNewInstSymbol(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Display Name"
            placeholder="e.g. Micro Gold Futures"
            value={newInstName}
            onChange={(e) => setNewInstName(e.currentTarget.value)}
            required
          />
          <SimpleGrid cols={2} spacing="xs">
            <TextInput
              label="Tick Size"
              value={newInstTick}
              onChange={(e) => setNewInstTick(e.currentTarget.value)}
            />
            <TextInput
              label="Point Value ($ / point)"
              value={newInstPointVal}
              onChange={(e) => setNewInstPointVal(e.currentTarget.value)}
            />
          </SimpleGrid>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeInstModal}>
              Cancel
            </Button>
            <Button
              color="indigo"
              loading={createInstrumentMutation.isPending}
              onClick={() => createInstrumentMutation.mutate()}
            >
              Save Instrument
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

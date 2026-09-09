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
  SegmentedControl,
  SimpleGrid,
  Select,
  Modal,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendar,
  IconPlus,
  IconCheck,
  IconAlertCircle,
  IconArrowRight,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiClient } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { formatDate, getDailyGradeColor } from '../../lib/formatters.js';

export const JournalListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure();
  const [customDate, setCustomDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

  const { data: journalsResponse, isLoading } = useQuery({
    queryKey: queryKeys.journals.list({ filterType, grade: selectedGrade }),
    queryFn: () => apiClient.journals.list(),
  });

  const journals = journalsResponse?.items || [];

  const createJournalMutation = useMutation({
    mutationFn: (date: string) => apiClient.journals.createOrGet({ journalDate: date }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journals.all });
      closeCreateModal();
      navigate(`/journals/${data.journalDate}`);
    },
  });

  const handleCreateOrOpen = (date: string) => {
    createJournalMutation.mutate(date);
  };

  const filteredJournals = journals.filter((j: any) => {
    if (filterType === 'needs_review' && j.status === 'REVIEWED') return false;
    if (filterType === 'no_trade' && !j.isNoTradeDay) return false;
    if (selectedGrade && j.calculatedGrade !== selectedGrade && j.gradeOverride !== selectedGrade)
      return false;
    return true;
  });

  return (
    <Stack gap="lg">
      {/* Header Bar */}
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Group justify="space-between" wrap="wrap" gap="md">
          <div>
            <Title order={2} style={{ color: '#1e293b', fontWeight: 700 }}>
              Daily Journal Calendar & History
            </Title>
            <Text c="dimmed" size="sm">
              Structured preparation, top-down market analysis, and end-of-day reviews
            </Text>
          </div>

          <Group gap="sm">
            <Button
              variant="filled"
              color="indigo"
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={openCreateModal}
            >
              New Journal Entry
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Filters Bar */}
      <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <SegmentedControl
            size="sm"
            value={filterType}
            onChange={setFilterType}
            data={[
              { label: 'All Journals', value: 'all' },
              { label: 'Needs Review', value: 'needs_review' },
              { label: 'No-Trade Days', value: 'no_trade' },
            ]}
          />

          <Group gap="xs">
            <Select
              size="sm"
              placeholder="Filter by Grade"
              clearable
              data={[
                { value: 'A', label: 'Grade A (Score 9-10)' },
                { value: 'B', label: 'Grade B (Score 7-8)' },
                { value: 'C', label: 'Grade C (Score 5-6)' },
                { value: 'D', label: 'Grade D (Violations)' },
              ]}
              value={selectedGrade}
              onChange={setSelectedGrade}
              style={{ width: 200 }}
            />
          </Group>
        </Group>
      </Paper>

      {/* Journal List Cards / Table */}
      <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
        <Table.ScrollContainer minWidth={700}>
          <Table verticalSpacing="md" striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Journal Date</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Readiness</Table.Th>
                <Table.Th>Process Score</Table.Th>
                <Table.Th>Daily Grade</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredJournals.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    No journal entries matching the selected filter.
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredJournals.map((journal: any) => {
                  const effectiveGrade = journal.gradeOverride || journal.calculatedGrade;
                  const gradeColor = getDailyGradeColor(effectiveGrade);

                  return (
                    <Table.Tr
                      key={journal.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/journals/${journal.journalDate}`)}
                    >
                      <Table.Td fw={600} style={{ color: '#1e293b' }}>
                        {formatDate(journal.journalDate)}
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant={journal.status === 'REVIEWED' ? 'filled' : 'light'}
                          color={
                            journal.status === 'REVIEWED'
                              ? 'teal'
                              : journal.status === 'ACTIVE'
                              ? 'indigo'
                              : 'gray'
                          }
                        >
                          {journal.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          Sleep {journal.sleepQuality || '—'}/10 • Focus {journal.focusRating || '—'}/10
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {journal.processEvaluation?.score ? (
                          <Badge variant="outline" color="indigo">
                            {parseFloat(journal.processEvaluation.score).toFixed(1)} / 10
                          </Badge>
                        ) : (
                          <Text size="xs" c="dimmed">
                            Incomplete
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {effectiveGrade ? (
                          <Group gap="xs">
                            <Badge color={gradeColor} variant="filled" size="lg">
                              Grade {effectiveGrade}
                            </Badge>
                            {journal.gradeOverride && (
                              <Badge color="orange" variant="light" size="xs">
                                Overridden
                              </Badge>
                            )}
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">
                            Not Graded
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {journal.isNoTradeDay ? (
                          <Badge color="gray" variant="light">
                            No-Trade Day
                          </Badge>
                        ) : (
                          <Badge color="blue" variant="light">
                            Trading Day
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Button
                          size="xs"
                          variant="light"
                          color="indigo"
                          rightSection={<IconArrowRight size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/journals/${journal.journalDate}`);
                          }}
                        >
                          Open
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      {/* Create / Open Date Modal */}
      <Modal
        opened={createModalOpened}
        onClose={closeCreateModal}
        title="Open or Create Daily Journal"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter a date in YYYY-MM-DD format to open an existing journal or initialize a new one in
            Asia/Kathmandu timezone boundary.
          </Text>
          <TextInput
            label="Journal Date"
            placeholder="YYYY-MM-DD"
            value={customDate}
            onChange={(e) => setCustomDate(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button
              color="indigo"
              loading={createJournalMutation.isPending}
              onClick={() => handleCreateOrOpen(customDate)}
            >
              Open Journal
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

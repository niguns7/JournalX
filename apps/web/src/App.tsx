import React from 'react';
import {
  MantineProvider,
  Paper,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  SimpleGrid,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

import { theme } from './theme/theme.js';
import { AppLayout } from './components/layout/AppLayout.js';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} forceColorScheme="light">
        <Notifications position="top-right" />
        <AppLayout>
          <Stack gap="lg">
            <Paper p="xl" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
              <Group justify="space-between" align="flex-start" mb="md">
                <div>
                  <Title order={2} c="slate.9" mb="xs">
                    Welcome to JournalX
                  </Title>
                  <Text c="dimmed" size="sm">
                    Structured multi-timeframe trading execution & discipline tracker
                  </Text>
                </div>
                <Badge color="green" variant="light" size="lg">
                  System Initialized
                </Badge>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt="xl">
                <Card withBorder padding="md" radius="md">
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                    Active Timezone
                  </Text>
                  <Text fw={700} size="lg" mt="xs">
                    Asia/Kathmandu
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    Primary calendar journal boundary
                  </Text>
                </Card>

                <Card withBorder padding="md" radius="md">
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                    Seeded Playbook
                  </Text>
                  <Text fw={700} size="lg" mt="xs">
                    MGC Top-Down Sweep v1
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    10 mandatory conditions (10/10 required)
                  </Text>
                </Card>

                <Card withBorder padding="md" radius="md">
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                    Instrument Multiplier
                  </Text>
                  <Text fw={700} size="lg" mt="xs">
                    $10.00 / pt
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    Micro Gold Futures (0.1 tick size)
                  </Text>
                </Card>
              </SimpleGrid>
            </Paper>
          </Stack>
        </AppLayout>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;

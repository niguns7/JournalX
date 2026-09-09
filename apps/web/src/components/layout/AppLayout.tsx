import React from 'react';
import {
  AppShell,
  Group,
  Title,
  Text,
  Button,
  NavLink,
  Stack,
  Badge,
  Box,
} from '@mantine/core';
import {
  IconLayoutDashboard,
  IconBook2,
  IconReceipt2,
  IconChartBar,
  IconNotebook,
  IconSettings,
  IconPlus,
} from '@tabler/icons-react';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const currentPath = window.location.pathname;

  const navItems = [
    { label: 'Dashboard', icon: IconLayoutDashboard, href: '/' },
    { label: 'Daily Journal', icon: IconBook2, href: '/journals' },
    { label: 'Trade Log', icon: IconReceipt2, href: '/trades' },
    { label: 'Analytics', icon: IconChartBar, href: '/analytics' },
    { label: 'Playbook', icon: IconNotebook, href: '/playbook' },
    { label: 'Settings', icon: IconSettings, href: '/settings' },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm' }}
      padding="md"
      styles={{
        main: {
          backgroundColor: '#f8fafc',
          minHeight: '100vh',
        },
      }}
    >
      <AppShell.Header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 1rem',
        }}
      >
        <Group h="100%" justify="space-between" align="center">
          <Group gap="xs">
            <Text fz="xl">📊</Text>
            <Title order={3} c="indigo.8" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
              JournalX
            </Title>
            <Badge variant="light" color="indigo" size="sm">
              v1.0
            </Badge>
          </Group>

          <Group gap="sm">
            <Button
              leftSection={<IconPlus size={16} />}
              color="indigo"
              variant="filled"
              size="sm"
              onClick={() => {
                window.location.href = '/journals';
              }}
            >
              Open Today
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="md"
        style={{
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0',
        }}
      >
        <AppShell.Section grow>
          <Stack gap="xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.href);

              return (
                <NavLink
                  key={item.href}
                  label={item.label}
                  leftSection={<Icon size={18} stroke={1.5} />}
                  active={isActive}
                  variant="light"
                  color="indigo"
                  href={item.href}
                  style={{
                    borderRadius: '8px',
                    fontWeight: isActive ? 600 : 500,
                  }}
                />
              );
            })}
          </Stack>
        </AppShell.Section>

        <AppShell.Section pt="md" style={{ borderTop: '1px solid #f1f5f9' }}>
          <Text size="xs" c="dimmed">
            Personal Trading Journal
          </Text>
          <Text size="xs" c="dimmed" fw={500}>
            Single-Owner Edition
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box p="md">{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
};

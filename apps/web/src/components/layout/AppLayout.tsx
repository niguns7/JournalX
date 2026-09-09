import React, { useState } from 'react';
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
  Burger,
  Drawer,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard,
  IconBook2,
  IconReceipt2,
  IconChartBar,
  IconNotebook,
  IconSettings,
  IconPlus,
  IconClock,
  IconFlask,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { isFixtureMode } from '../../lib/api.js';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [opened, { toggle, close }] = useDisclosure();
  const todayDate = dayjs().format('YYYY-MM-DD');

  const navItems = [
    { label: 'Dashboard', icon: IconLayoutDashboard, href: '/' },
    { label: 'Daily Journal', icon: IconBook2, href: '/journals' },
    { label: 'Trade Log', icon: IconReceipt2, href: '/trades' },
    { label: 'Analytics', icon: IconChartBar, href: '/analytics' },
    { label: 'Playbook', icon: IconNotebook, href: '/playbook' },
    { label: 'Settings', icon: IconSettings, href: '/settings' },
  ];

  const handleOpenToday = () => {
    navigate(`/journals/${todayDate}`);
    close();
  };

  const renderNavLinks = () => (
    <Stack gap="xs">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.href);

        return (
          <NavLink
            key={item.href}
            label={item.label}
            leftSection={<Icon size={18} stroke={1.5} />}
            active={isActive}
            variant="light"
            color="indigo"
            onClick={() => {
              navigate(item.href);
              close();
            }}
            style={{
              borderRadius: '8px',
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
            }}
          />
        );
      })}
    </Stack>
  );

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
      styles={{
        main: {
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          color: '#1e293b',
        },
      }}
    >
      <AppShell.Header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e9ecef',
          padding: '0 1.25rem',
        }}
      >
        <Group h="100%" justify="space-between" align="center">
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Toggle navigation"
            />
            <Text fz="xl" style={{ userSelect: 'none' }}>
              📊
            </Text>
            <div>
              <Group gap="xs" align="center">
                <Title
                  order={3}
                  c="indigo.8"
                  style={{
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate('/')}
                >
                  JournalX
                </Title>
                <Badge variant="light" color="indigo" size="xs">
                  v1.0
                </Badge>
                {isFixtureMode && (
                  <Tooltip label="Deterministic dev fixtures active">
                    <Badge
                      variant="filled"
                      color="orange"
                      size="xs"
                      leftSection={<IconFlask size={10} />}
                    >
                      Fixture Mode
                    </Badge>
                  </Tooltip>
                )}
              </Group>
            </div>
          </Group>

          <Group gap="md">
            <Badge
              variant="outline"
              color="gray"
              size="sm"
              leftSection={<IconClock size={12} />}
              style={{ textTransform: 'none' }}
              visibleFrom="xs"
            >
              Asia/Kathmandu (NPT)
            </Badge>

            <Button
              leftSection={<IconPlus size={16} />}
              color="indigo"
              variant="filled"
              size="sm"
              onClick={handleOpenToday}
              style={{ fontWeight: 600 }}
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
          borderRight: '1px solid #e9ecef',
        }}
      >
        <AppShell.Section grow>{renderNavLinks()}</AppShell.Section>

        <AppShell.Section pt="md" style={{ borderTop: '1px solid #f1f5f9' }}>
          <Text size="xs" c="dimmed">
            Personal Multi-Timeframe Journal
          </Text>
          <Text size="xs" c="dimmed" fw={500}>
            Micro Gold Futures (MGC)
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box p={{ base: 'xs', sm: 'md' }}>{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
};

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

import { theme } from './theme/theme.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { DashboardPage } from './features/dashboard/DashboardPage.js';
import { JournalListPage } from './features/journals/JournalListPage.js';
import { JournalWorkspacePage } from './features/journals/workspace/JournalWorkspacePage.js';
import { TradeLogPage } from './features/trades/log/TradeLogPage.js';
import { TradeDetailPage } from './features/trades/TradeDetailPage.js';
import { TradePlanModal } from './features/trades/TradePlanModal.js';
import { TradeRecordExecutionModal } from './features/trades/TradeRecordExecutionModal.js';
import { AnalyticsPage } from './features/analytics/AnalyticsPage.js';
import { PlaybookPage } from './features/playbook/PlaybookPage.js';
import { SettingsPage } from './features/settings/SettingsPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  const [tradePlanOpened, setTradePlanOpened] = useState(false);
  const [recordExecOpened, setRecordExecOpened] = useState(false);
  const [activeJournalId, setActiveJournalId] = useState('jour-today');

  const handleOpenTradePlan = (jId?: string) => {
    if (jId) setActiveJournalId(jId);
    setTradePlanOpened(true);
  };

  const handleOpenRecordExecution = (jId?: string) => {
    if (jId) setActiveJournalId(jId);
    setRecordExecOpened(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} forceColorScheme="light">
        <Notifications position="top-right" />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardPage
                    onOpenTradePlan={() => handleOpenTradePlan()}
                    onOpenRecordExecution={() => handleOpenRecordExecution()}
                  />
                }
              />
              <Route path="/journals" element={<JournalListPage />} />
              <Route
                path="/journals/:date"
                element={
                  <JournalWorkspacePage
                    onOpenTradePlan={handleOpenTradePlan}
                    onOpenRecordExecution={handleOpenRecordExecution}
                  />
                }
              />
              <Route
                path="/trades"
                element={
                  <TradeLogPage
                    onOpenTradePlan={() => handleOpenTradePlan()}
                    onOpenRecordExecution={() => handleOpenRecordExecution()}
                  />
                }
              />
              <Route path="/trades/:id" element={<TradeDetailPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/playbook" element={<PlaybookPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>

          {/* Global Modals */}
          <TradePlanModal
            opened={tradePlanOpened}
            onClose={() => setTradePlanOpened(false)}
            journalId={activeJournalId}
          />
          <TradeRecordExecutionModal
            opened={recordExecOpened}
            onClose={() => setRecordExecOpened(false)}
            journalId={activeJournalId}
          />
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;

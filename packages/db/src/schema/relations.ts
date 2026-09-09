import { relations } from 'drizzle-orm';
import { appSettings } from './settings';
import { tradingAccounts } from './accounts';
import { instruments } from './instruments';
import { strategies, strategyVersions } from './strategies';
import {
  dailyJournals,
  journalAccountLimits,
  journalWindows,
  economicEvents,
  timeframeAnalyses,
  marketZones,
  journalScenarios,
  quarterObservations,
} from './journals';
import {
  trades,
  tradeChecklistAnswers,
  tradeManagementEvents,
  tradeViolations,
} from './trades';
import { attachments } from './attachments';

export const appSettingsRelations = relations(appSettings, ({ one }) => ({
  defaultAccount: one(tradingAccounts, {
    fields: [appSettings.defaultAccountId],
    references: [tradingAccounts.id],
  }),
}));

export const tradingAccountsRelations = relations(tradingAccounts, ({ many }) => ({
  journalLimits: many(journalAccountLimits),
  trades: many(trades),
}));

export const instrumentsRelations = relations(instruments, ({ many }) => ({
  trades: many(trades),
}));

export const strategiesRelations = relations(strategies, ({ one, many }) => ({
  currentPublishedVersion: one(strategyVersions, {
    fields: [strategies.currentPublishedVersionId],
    references: [strategyVersions.id],
  }),
  versions: many(strategyVersions),
}));

export const strategyVersionsRelations = relations(strategyVersions, ({ one, many }) => ({
  strategy: one(strategies, {
    fields: [strategyVersions.strategyId],
    references: [strategies.id],
  }),
  trades: many(trades),
}));

export const dailyJournalsRelations = relations(dailyJournals, ({ many }) => ({
  accountLimits: many(journalAccountLimits),
  windows: many(journalWindows),
  economicEvents: many(economicEvents),
  analyses: many(timeframeAnalyses),
  scenarios: many(journalScenarios),
  trades: many(trades),
  attachments: many(attachments),
}));

export const journalAccountLimitsRelations = relations(journalAccountLimits, ({ one }) => ({
  journal: one(dailyJournals, {
    fields: [journalAccountLimits.journalId],
    references: [dailyJournals.id],
  }),
  account: one(tradingAccounts, {
    fields: [journalAccountLimits.accountId],
    references: [tradingAccounts.id],
  }),
}));

export const journalWindowsRelations = relations(journalWindows, ({ one, many }) => ({
  journal: one(dailyJournals, {
    fields: [journalWindows.journalId],
    references: [dailyJournals.id],
  }),
  analyses: many(timeframeAnalyses),
  scenarios: many(journalScenarios),
  quarterObservations: many(quarterObservations),
  trades: many(trades),
}));

export const economicEventsRelations = relations(economicEvents, ({ one }) => ({
  journal: one(dailyJournals, {
    fields: [economicEvents.journalId],
    references: [dailyJournals.id],
  }),
}));

export const timeframeAnalysesRelations = relations(timeframeAnalyses, ({ one, many }) => ({
  journal: one(dailyJournals, {
    fields: [timeframeAnalyses.journalId],
    references: [dailyJournals.id],
  }),
  window: one(journalWindows, {
    fields: [timeframeAnalyses.windowId],
    references: [journalWindows.id],
  }),
  zones: many(marketZones),
}));

export const marketZonesRelations = relations(marketZones, ({ one }) => ({
  analysis: one(timeframeAnalyses, {
    fields: [marketZones.analysisId],
    references: [timeframeAnalyses.id],
  }),
}));

export const journalScenariosRelations = relations(journalScenarios, ({ one, many }) => ({
  journal: one(dailyJournals, {
    fields: [journalScenarios.journalId],
    references: [dailyJournals.id],
  }),
  window: one(journalWindows, {
    fields: [journalScenarios.windowId],
    references: [journalWindows.id],
  }),
  trades: many(trades),
}));

export const quarterObservationsRelations = relations(quarterObservations, ({ one }) => ({
  window: one(journalWindows, {
    fields: [quarterObservations.windowId],
    references: [journalWindows.id],
  }),
}));

export const tradesRelations = relations(trades, ({ one, many }) => ({
  journal: one(dailyJournals, {
    fields: [trades.journalId],
    references: [dailyJournals.id],
  }),
  account: one(tradingAccounts, {
    fields: [trades.accountId],
    references: [tradingAccounts.id],
  }),
  instrument: one(instruments, {
    fields: [trades.instrumentId],
    references: [instruments.id],
  }),
  strategyVersion: one(strategyVersions, {
    fields: [trades.strategyVersionId],
    references: [strategyVersions.id],
  }),
  window: one(journalWindows, {
    fields: [trades.windowId],
    references: [journalWindows.id],
  }),
  scenario: one(journalScenarios, {
    fields: [trades.scenarioId],
    references: [journalScenarios.id],
  }),
  checklistAnswers: many(tradeChecklistAnswers),
  managementEvents: many(tradeManagementEvents),
  violations: many(tradeViolations),
  attachments: many(attachments),
}));

export const tradeChecklistAnswersRelations = relations(tradeChecklistAnswers, ({ one }) => ({
  trade: one(trades, {
    fields: [tradeChecklistAnswers.tradeId],
    references: [trades.id],
  }),
}));

export const tradeManagementEventsRelations = relations(tradeManagementEvents, ({ one }) => ({
  trade: one(trades, {
    fields: [tradeManagementEvents.tradeId],
    references: [trades.id],
  }),
}));

export const tradeViolationsRelations = relations(tradeViolations, ({ one }) => ({
  trade: one(trades, {
    fields: [tradeViolations.tradeId],
    references: [trades.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  journal: one(dailyJournals, {
    fields: [attachments.journalId],
    references: [dailyJournals.id],
  }),
  trade: one(trades, {
    fields: [attachments.tradeId],
    references: [trades.id],
  }),
}));

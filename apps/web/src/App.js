import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MantineProvider, Paper, Title, Text, Stack, Card, Group, Badge, SimpleGrid, } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import { theme } from './theme/theme.js';
import { AppLayout } from './components/layout/AppLayout.js';
const queryClient = new QueryClient();
export function App() {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsxs(MantineProvider, { theme: theme, forceColorScheme: "light", children: [_jsx(Notifications, { position: "top-right" }), _jsx(AppLayout, { children: _jsx(Stack, { gap: "lg", children: _jsxs(Paper, { p: "xl", radius: "md", withBorder: true, style: { backgroundColor: '#ffffff' }, children: [_jsxs(Group, { justify: "space-between", align: "flex-start", mb: "md", children: [_jsxs("div", { children: [_jsx(Title, { order: 2, c: "slate.9", mb: "xs", children: "Welcome to JournalX" }), _jsx(Text, { c: "dimmed", size: "sm", children: "Structured multi-timeframe trading execution & discipline tracker" })] }), _jsx(Badge, { color: "green", variant: "light", size: "lg", children: "System Initialized" })] }), _jsxs(SimpleGrid, { cols: { base: 1, sm: 3 }, spacing: "md", mt: "xl", children: [_jsxs(Card, { withBorder: true, padding: "md", radius: "md", children: [_jsx(Text, { size: "xs", tt: "uppercase", fw: 700, c: "dimmed", children: "Active Timezone" }), _jsx(Text, { fw: 700, size: "lg", mt: "xs", children: "Asia/Kathmandu" }), _jsx(Text, { size: "xs", c: "dimmed", mt: 4, children: "Primary calendar journal boundary" })] }), _jsxs(Card, { withBorder: true, padding: "md", radius: "md", children: [_jsx(Text, { size: "xs", tt: "uppercase", fw: 700, c: "dimmed", children: "Seeded Playbook" }), _jsx(Text, { fw: 700, size: "lg", mt: "xs", children: "MGC Top-Down Sweep v1" }), _jsx(Text, { size: "xs", c: "dimmed", mt: 4, children: "10 mandatory conditions (10/10 required)" })] }), _jsxs(Card, { withBorder: true, padding: "md", radius: "md", children: [_jsx(Text, { size: "xs", tt: "uppercase", fw: 700, c: "dimmed", children: "Instrument Multiplier" }), _jsx(Text, { fw: 700, size: "lg", mt: "xs", children: "$10.00 / pt" }), _jsx(Text, { size: "xs", c: "dimmed", mt: 4, children: "Micro Gold Futures (0.1 tick size)" })] })] })] }) }) })] }) }));
}
export default App;
//# sourceMappingURL=App.js.map
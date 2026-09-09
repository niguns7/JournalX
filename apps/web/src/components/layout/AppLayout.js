import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AppShell, Group, Title, Text, Button, NavLink, Stack, Badge, Box, } from '@mantine/core';
import { IconLayoutDashboard, IconBook2, IconReceipt2, IconChartBar, IconNotebook, IconSettings, IconPlus, } from '@tabler/icons-react';
export const AppLayout = ({ children }) => {
    const currentPath = window.location.pathname;
    const navItems = [
        { label: 'Dashboard', icon: IconLayoutDashboard, href: '/' },
        { label: 'Daily Journal', icon: IconBook2, href: '/journals' },
        { label: 'Trade Log', icon: IconReceipt2, href: '/trades' },
        { label: 'Analytics', icon: IconChartBar, href: '/analytics' },
        { label: 'Playbook', icon: IconNotebook, href: '/playbook' },
        { label: 'Settings', icon: IconSettings, href: '/settings' },
    ];
    return (_jsxs(AppShell, { header: { height: 60 }, navbar: { width: 240, breakpoint: 'sm' }, padding: "md", styles: {
            main: {
                backgroundColor: '#f8fafc',
                minHeight: '100vh',
            },
        }, children: [_jsx(AppShell.Header, { style: {
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '0 1rem',
                }, children: _jsxs(Group, { h: "100%", justify: "space-between", align: "center", children: [_jsxs(Group, { gap: "xs", children: [_jsx(Text, { fz: "xl", children: "\uD83D\uDCCA" }), _jsx(Title, { order: 3, c: "indigo.8", style: { fontWeight: 700, letterSpacing: '-0.02em' }, children: "JournalX" }), _jsx(Badge, { variant: "light", color: "indigo", size: "sm", children: "v1.0" })] }), _jsx(Group, { gap: "sm", children: _jsx(Button, { leftSection: _jsx(IconPlus, { size: 16 }), color: "indigo", variant: "filled", size: "sm", onClick: () => {
                                    window.location.href = '/journals';
                                }, children: "Open Today" }) })] }) }), _jsxs(AppShell.Navbar, { p: "md", style: {
                    backgroundColor: '#ffffff',
                    borderRight: '1px solid #e2e8f0',
                }, children: [_jsx(AppShell.Section, { grow: true, children: _jsx(Stack, { gap: "xs", children: navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.href === '/'
                                    ? currentPath === '/'
                                    : currentPath.startsWith(item.href);
                                return (_jsx(NavLink, { label: item.label, leftSection: _jsx(Icon, { size: 18, stroke: 1.5 }), active: isActive, variant: "light", color: "indigo", href: item.href, style: {
                                        borderRadius: '8px',
                                        fontWeight: isActive ? 600 : 500,
                                    } }, item.href));
                            }) }) }), _jsxs(AppShell.Section, { pt: "md", style: { borderTop: '1px solid #f1f5f9' }, children: [_jsx(Text, { size: "xs", c: "dimmed", children: "Personal Trading Journal" }), _jsx(Text, { size: "xs", c: "dimmed", fw: 500, children: "Single-Owner Edition" })] })] }), _jsx(AppShell.Main, { children: _jsx(Box, { p: "md", children: children }) })] }));
};
//# sourceMappingURL=AppLayout.js.map
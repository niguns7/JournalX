import React, { useState } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { theme } from '../theme/theme.js';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

interface AllTheProvidersProps {
  children: React.ReactNode;
}

export function AllTheProviders({ children }: AllTheProvidersProps) {
  const [queryClient] = useState(() => createTestQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} forceColorScheme="light">
        <BrowserRouter>{children}</BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };

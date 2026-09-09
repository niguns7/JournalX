import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/test-utils.js';
import { AppLayout } from '../AppLayout.js';

describe('AppLayout Component', () => {
  it('renders navigation header, Open Today button, and navigation links', () => {
    render(
      <AppLayout>
        <div>Content Area</div>
      </AppLayout>,
    );

    expect(screen.getByText('JournalX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Today/i })).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Daily Journal')).toBeInTheDocument();
    expect(screen.getByText('Trade Log')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Playbook')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Content Area')).toBeInTheDocument();
  });
});

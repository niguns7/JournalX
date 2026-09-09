import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils.js';
import { TradePlanModal } from '../TradePlanModal.js';

describe('TradePlanModal Component', () => {
  it('renders modal with live risk calculations and mandatory checklist items', async () => {
    render(<TradePlanModal opened={true} onClose={() => {}} journalId="jour-today" />);

    expect(await screen.findByText(/Plan New Trade — MGC Top-Down Sweep Strategy/i)).toBeInTheDocument();
    expect(screen.getByText(/10 Mandatory Strategy Checklist Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Planned Gross Price Risk/i)).toBeInTheDocument();
    expect(screen.getByText(/Plan Eligible/i)).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Save Trade Plan/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('marks trade plan INELIGIBLE if any mandatory checklist item is unchecked', async () => {
    render(<TradePlanModal opened={true} onClose={() => {}} journalId="jour-today" />);

    // Find the first checkbox and uncheck it
    const firstCheckbox = await screen.findByLabelText(/1. Higher-Timeframe Context/i);
    expect(firstCheckbox).toBeChecked();

    fireEvent.click(firstCheckbox);
    expect(firstCheckbox).not.toBeChecked();

    // Now it should show Plan Ineligible
    expect(await screen.findByText(/Plan Ineligible/i)).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Save Trade Plan/i });
    expect(saveButton).toBeDisabled();
  });
});

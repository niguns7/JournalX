import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils.js';
import { TradeRecordExecutionModal } from '../TradeRecordExecutionModal.js';

describe('TradeRecordExecutionModal Component', () => {
  it('renders modal and handles unconfirmed fees with warning', async () => {
    render(<TradeRecordExecutionModal opened={true} onClose={() => {}} journalId="jour-today" />);

    expect(screen.getByText(/Record Executed Trade/i)).toBeInTheDocument();
    expect(screen.getByText(/Trade is already closed/i)).toBeInTheDocument();

    const feesConfirmedCheckbox = screen.getByLabelText(/Fees Confirmed/i);
    expect(feesConfirmedCheckbox).toBeChecked();

    // Uncheck fees confirmed
    fireEvent.click(feesConfirmedCheckbox);
    expect(feesConfirmedCheckbox).not.toBeChecked();

    // Should display provisional warning
    expect(
      screen.getByText(/Without confirmed fees, Net P\/L & Net R will remain provisional/i),
    ).toBeInTheDocument();
  });

  it('requires explicit violation acknowledgment when logging non-compliant trades', async () => {
    render(<TradeRecordExecutionModal opened={true} onClose={() => {}} journalId="jour-today" />);

    const flagViolationCheckbox = screen.getByLabelText(/Flag this execution as having rule violations/i);
    expect(flagViolationCheckbox).not.toBeChecked();

    fireEvent.click(flagViolationCheckbox);
    expect(flagViolationCheckbox).toBeChecked();

    // Notice appears
    expect(screen.getByText(/Non-Compliant Actual Trade Acknowledgment/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Record Actual Execution/i });
    expect(submitBtn).toBeDisabled();

    // Check the acknowledgment checkbox
    const ackCheckbox = screen.getByLabelText(/I acknowledge this trade violated playbook rules/i);
    fireEvent.click(ackCheckbox);

    expect(submitBtn).not.toBeDisabled();
  });
});

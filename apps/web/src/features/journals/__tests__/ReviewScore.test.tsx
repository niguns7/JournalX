import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../../../test/test-utils.js';
import { JournalWorkspacePage } from '../workspace/JournalWorkspacePage.js';

describe('Journal End-of-Day Review & Process Score', () => {
  it('renders EOD review with 10 process checklist items and calculates score', async () => {
    render(<JournalWorkspacePage initialTab="review" />);

    expect(await screen.findByText(/Process Discipline Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Process Evaluation Checklist \(10 Items\)/i)).toBeInTheDocument();
    expect(screen.getByText(/10 \/ 10 Points/i)).toBeInTheDocument();
  });
});

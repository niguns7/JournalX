import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '../../../test/test-utils.js';
import { useAutosave } from '../../../lib/hooks/useAutosave.js';

function TestAutosaveComponent({ onSave }: { onSave: (data: any) => Promise<void> }) {
  const [data, setData] = useState({ text: 'initial' });
  const { status, errorMessage, retry } = useAutosave({
    data,
    onSave,
    debounceMs: 50,
  });

  return (
    <div>
      <span data-testid="status">{status}</span>
      {errorMessage && <span data-testid="error">{errorMessage}</span>}
      <button onClick={() => setData({ text: 'updated' })}>Update Text</button>
      <button onClick={retry}>Retry</button>
    </div>
  );
}

describe('useAutosave Hook', () => {
  it('triggers debounced save and transitions status to saved', async () => {
    vi.useFakeTimers();
    const mockSave = vi.fn().mockResolvedValue(undefined);

    render(<TestAutosaveComponent onSave={mockSave} />);

    expect(screen.getByTestId('status').textContent).toBe('idle');

    // Trigger update
    act(() => {
      screen.getByText('Update Text').click();
    });

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(60);
    });

    expect(mockSave).toHaveBeenCalledWith({ text: 'updated' });
    expect(screen.getByTestId('status').textContent).toBe('saved');

    vi.useRealTimers();
  });
});

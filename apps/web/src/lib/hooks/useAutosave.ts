import { useState, useEffect, useRef, useCallback } from 'react';
import { ApiError } from '@journalx/api-client';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

export interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutosave<T>({
  data,
  onSave,
  debounceMs = 1200,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<unknown | null>(null);
  const [lastSavedData, setLastSavedData] = useState<T | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<T>(data);
  latestDataRef.current = data;
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  const hasUnsavedChanges =
    lastSavedData !== null && JSON.stringify(data) !== JSON.stringify(lastSavedData);

  const triggerSave = useCallback(async () => {
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const currentToSave = latestDataRef.current;
    isSavingRef.current = true;
    setStatus('saving');
    setErrorMessage(null);

    try {
      await onSave(currentToSave);
      setLastSavedData(currentToSave);
      setStatus('saved');
      setConflictDetails(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setStatus('conflict');
        setErrorMessage(
          'Version conflict: Journal was updated in another tab or session. Your local edits are preserved.',
        );
        setConflictDetails(err.errorData.details);
      } else {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Autosave failed');
      }
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        triggerSave();
      }
    }
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      triggerSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, debounceMs, enabled, triggerSave]);

  // Warn on page close if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || status === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, status]);

  const retry = () => {
    triggerSave();
  };

  return {
    status,
    errorMessage,
    conflictDetails,
    retry,
    hasUnsavedChanges,
  };
}

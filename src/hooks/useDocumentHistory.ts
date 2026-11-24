import { useCallback, useRef, useState } from 'react';
import type { DocumentSnapshot } from '../types/handwriting';

const MAX_HISTORY_ENTRIES = 60;
const TEXT_GROUP_WINDOW_MS = 700;

interface HistoryState {
  past: DocumentSnapshot[];
  present: DocumentSnapshot;
  future: DocumentSnapshot[];
}

export function useDocumentHistory(
  initial: DocumentSnapshot | (() => DocumentSnapshot),
) {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: typeof initial === 'function' ? initial() : initial,
    future: [],
  }));

  const lastPushTimeRef = useRef<number>(0);
  const lastPushKindRef = useRef<'text' | 'settings' | null>(null);

  const commitSnapshot = useCallback(
    (
      updater: (prev: DocumentSnapshot) => DocumentSnapshot,
      kind: 'text' | 'settings' | 'replace' = 'settings',
    ) => {
      const now = Date.now();
      setHistory((prev) => {
        const next = updater(prev.present);
        if (next === prev.present) return prev;

        // Group rapid keystroke typing into sensible undo chunks,
        // but never coalesce bulk changes (clear, paste, file upload).
        const isSmallIncrementalEdit =
          next.text.length > 0 &&
          Math.abs(next.text.length - prev.present.text.length) <= 4;
        const shouldCoalesce =
          kind === 'text' &&
          isSmallIncrementalEdit &&
          lastPushKindRef.current === 'text' &&
          now - lastPushTimeRef.current < TEXT_GROUP_WINDOW_MS &&
          prev.past.length > 0;

        lastPushTimeRef.current = now;
        lastPushKindRef.current =
          kind === 'text' && isSmallIncrementalEdit ? 'text' : null;

        if (shouldCoalesce) {
          return {
            past: prev.past,
            present: next,
            future: [],
          };
        }

        const nextPast = [...prev.past, prev.present];
        if (nextPast.length > MAX_HISTORY_ENTRIES) {
          nextPast.shift();
        }
        return {
          past: nextPast,
          present: next,
          future: [],
        };
      });
    },
    [],
  );

  const undo = useCallback(() => {
    lastPushKindRef.current = null;
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const nextPast = prev.past.slice(0, -1);
      return {
        past: nextPast,
        present: previous,
        future: [prev.present, ...prev.future].slice(0, MAX_HISTORY_ENTRIES),
      };
    });
  }, []);

  const redo = useCallback(() => {
    lastPushKindRef.current = null;
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const [next, ...restFuture] = prev.future;
      return {
        past: [...prev.past, prev.present].slice(-MAX_HISTORY_ENTRIES),
        present: next,
        future: restFuture,
      };
    });
  }, []);

  return {
    snapshot: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commitSnapshot,
    undo,
    redo,
  };
}

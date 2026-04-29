'use client';

import { useEffect, useRef } from 'react';
import { addWatchHistory, type HistoryItem } from '@/lib/history';

export default function HistoryTracker({ item }: { item: Omit<HistoryItem, 'timestamp'> }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      addWatchHistory(item);
      tracked.current = true;
    }
  }, [item]);

  return null;
}

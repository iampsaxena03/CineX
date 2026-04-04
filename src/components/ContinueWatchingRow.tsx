'use client';

import { useEffect, useState } from 'react';
import { getWatchHistory, type HistoryItem } from '@/lib/history';
import MediaCard from './MediaCard';

export default function ContinueWatchingRow() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const updateHistory = () => {
      setHistory(getWatchHistory());
    };
    
    updateHistory();
    setMounted(true);

    window.addEventListener("historyUpdated", updateHistory);
    return () => window.removeEventListener("historyUpdated", updateHistory);
  }, []);

  if (!mounted || history.length === 0) return null;

  return (
    <div style={{ marginBottom: "5rem" }}>
      <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Continue Watching
      </h2>
      <div className="grid">
        {history.map((item, index) => {
          // Adapt history item to match TMDBMediaItem interface since MediaCard expects it
          const mediaItem = {
            ...item,
            media_type: item.type,
            name: item.title,
            first_air_date: "", // or save into history if needed
          } as any;
          
          return (
            <MediaCard 
              key={`${item.type}-${item.id}`} 
              item={mediaItem} 
              stagger={index * 0.05} 
              showRemoveHistory={true}
            />
          );
        })}
      </div>
    </div>
  );
}

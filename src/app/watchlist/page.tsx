'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VscBookmark } from 'react-icons/vsc';
import { getWatchlist } from '@/lib/watchlist';
import MediaCard from '@/components/MediaCard';
import type { HistoryItem } from '@/lib/history';

export default function WatchlistPage() {
  const [list, setList] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setList(getWatchlist());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="page-wrapper container catalogue-page">
      <div className="catalogue-header">
        <span className="eyebrow">Saved</span>
        <h1><VscBookmark color="var(--primary)" /> My List</h1>
        <p>
          Your personalized collection of saved movies and TV shows.
        </p>
      </div>

      <section>
        {list.length === 0 ? (
          <div className="empty-panel">
            <p>Your list is completely empty.</p>
            <Link href="/" className="text-link">
              Find something to watch
            </Link>
          </div>
        ) : (
          <div className="grid">
            {list.map((item, index) => {
              const mediaItem = {
                ...item,
                media_type: item.type,
                name: item.title,
                first_air_date: "", 
              } as any;
              
              return (
                <div key={`${item.type}-${item.id}`} style={{ position: 'relative' }}>
                  <MediaCard item={mediaItem} stagger={index * 0.05} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

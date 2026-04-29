'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VscBookmark, VscArrowLeft } from 'react-icons/vsc';
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
    <div className="page-wrapper container" style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "4rem 0 3rem" }}>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 4rem)",
            fontWeight: 700,
            marginBottom: "1rem",
            background: "linear-gradient(135deg, #fff 30%, var(--accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem"
          }}
        >
          <VscBookmark color="var(--primary)" /> My List
        </h1>
        <p style={{ fontSize: "1.15rem", maxWidth: 520, margin: "0 auto", opacity: 0.7, lineHeight: 1.7 }}>
          Your personalized collection of saved movies and TV shows.
        </p>
      </div>

      <section>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Your list is completely empty.</p>
            <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
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

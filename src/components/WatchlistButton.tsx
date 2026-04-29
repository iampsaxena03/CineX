'use client';

import React, { useState, useEffect } from 'react';
import { VscAdd, VscCheck } from 'react-icons/vsc';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/watchlist';

interface WatchlistButtonProps {
  item: {
    id: string | number;
    type: 'movie' | 'tv';
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
  };
}

export default function WatchlistButton({ item }: WatchlistButtonProps) {
  const [inList, setInList] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setInList(isInWatchlist(item.id));
    setMounted(true);
  }, [item.id]);

  const toggleList = () => {
    if (inList) {
      removeFromWatchlist(item.id);
      setInList(false);
    } else {
      addToWatchlist(item);
      setInList(true);
    }
  };

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <button
      onClick={toggleList}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        padding: '0.5rem 1rem',
        background: inList ? 'rgba(157, 0, 255, 0.2)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${inList ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '999px',
        color: inList ? 'var(--accent)' : 'white',
        cursor: 'pointer',
        fontSize: '0.85rem',
        transition: 'all 0.2s',
        fontWeight: inList ? 600 : 400
      }}
    >
      {inList ? <VscCheck size={16} /> : <VscAdd size={16} />} 
      {inList ? 'In My List' : 'Add to List'}
    </button>
  );
}

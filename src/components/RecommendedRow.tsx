'use client';

import { useEffect, useState, useRef } from 'react';
import { getUserSignals, encodeSeedsParam } from '@/lib/recommendations';
import MediaCard from './MediaCard';
import type { TMDBMediaItem } from '@/lib/tmdb';

/**
 * "Recommended for You" — Netflix-style personalized row.
 * 
 * On mount, collects user signals from localStorage, fetches
 * personalized recommendations from the API, and renders a
 * horizontal-scrollable grid with smooth loading transitions.
 */
export default function RecommendedRow() {
  const [items, setItems] = useState<TMDBMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInteraction, setHasInteraction] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const signals = getUserSignals();
    setHasInteraction(signals.hasInteraction);

    if (!signals.hasInteraction) {
      setLoading(false);
      return;
    }

    const seedsParam = encodeSeedsParam(signals.seeds);
    // Build exclusion list from all seed IDs
    const excludeParam = signals.seeds.map(s => s.id).join(',');

    fetch(`/api/tmdb/recommended?seeds=${seedsParam}&exclude=${excludeParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          setItems(data.results);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Don't render anything server-side or if user has no interaction history
  if (!mounted) return null;
  if (!hasInteraction && !loading) return null;
  if (!loading && items.length === 0) return null;

  return (
    <section style={{ marginBottom: '4rem' }}>
      <h2
        style={{
          fontSize: '1.6rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ color: 'var(--primary)' }}>✦</span> Recommended for You
      </h2>

      {loading ? (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="recommended-skeleton">
              <div className="skeleton" style={{ aspectRatio: '2/3', borderRadius: '12px' }} />
              <div
                className="skeleton skeleton-text"
                style={{ marginTop: '0.75rem', width: '80%', height: '0.85rem' }}
              />
              <div
                className="skeleton skeleton-text"
                style={{ marginTop: '0.35rem', width: '40%', height: '0.7rem' }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid"
          style={{
            animation: 'recommendedFadeIn 0.5s ease-out both',
          }}
        >
          {items.map((item, index) => (
            <MediaCard
              key={`rec-${item.media_type}-${item.id}`}
              item={item}
              stagger={index % 6 * 0.05}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes recommendedFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .recommended-skeleton {
          opacity: 0.6;
        }
      `}</style>
    </section>
  );
}

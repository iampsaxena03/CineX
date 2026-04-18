'use client';

import { useEffect, useState } from 'react';
import { getWatchHistory } from '@/lib/history';
import { getWatchlist } from '@/lib/watchlist';
import MediaCard from './MediaCard';
import { TMDBMediaItem } from '@/lib/tmdb';

interface RecommendedSectionProps {
  section: any;
  limit?: number;
}

export default function RecommendedSection({ section, limit = 6 }: RecommendedSectionProps) {
  const [recommendations, setRecommendations] = useState<TMDBMediaItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const history = getWatchHistory() || [];
        const watchlist = getWatchlist() || [];
        
        // Combine, sort by timestamp desc, take top 10 unique interacting items
        const combined = [...history, ...watchlist].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const uniqueSeeds = [];
        const seen = new Set();
        for (const item of combined) {
          if (!seen.has(item.id)) {
            uniqueSeeds.push({ id: item.id, type: item.type });
            seen.add(item.id);
          }
          if (uniqueSeeds.length >= 10) break;
        }

        const max = section.maxItems || limit;
        const res = await fetch(`/api/tmdb/recommended`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seeds: uniqueSeeds, limit: max })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.results) {
            setRecommendations(data.results);
          }
        }
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoading(false);
        setMounted(true);
      }
    };

    fetchRecommendations();
  }, [limit, section.maxItems]);

  if (!mounted || recommendations.length === 0) return null;

  return (
    <section style={{ marginBottom: '4rem' }}>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: "1.5rem" }}>
        <span style={{ color: "var(--primary)" }}>💡</span> {section.title}
      </h2>
      <div className="grid">
        {recommendations.map((item, index) => (
          <MediaCard 
            key={`${item.media_type}-${item.id}`} 
            item={item} 
            stagger={index % 6 * 0.05} 
          />
        ))}
      </div>
    </section>
  );
}

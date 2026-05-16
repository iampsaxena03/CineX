'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { VscSearch } from 'react-icons/vsc';
import MediaCard from '@/components/MediaCard';
import type { TMDBMediaItem } from '@/lib/tmdb';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<TMDBMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      if (!controller.signal.aborted && data.results) {
        setResults(data.results);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error("Search error:", err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // If navigated here with ?q=, trigger search immediately
  useEffect(() => {
    if (initialQuery.trim()) {
      setQuery(initialQuery);
      doSearch(initialQuery);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="public-page">
      <div className="page-wrapper container search-page">
        <div className="catalogue-header">
          <span className="eyebrow">Search</span>
          <h1>Find your next watch</h1>
        </div>
        <div className="search-input-wrap">
           <VscSearch className="search-page-icon" />
           <input 
             type="text" 
             placeholder="Search for movies, TV series..." 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
           />
        </div>
        
        {/* Loading State */}
        {loading && query.trim() !== '' && (
           <div className="empty-panel">
              <div className="spinner" />
              <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
              `}</style>
              <span>Searching...</span>
           </div>
        )}

        {/* Empty State */}
        {!loading && query.trim() !== '' && results.length === 0 && (
           <div className="empty-panel">
             <p>No results found for &quot;{query}&quot;</p>
             <p style={{ marginTop: '0.5rem' }}>Try modifying your search terms.</p>
           </div>
        )}

        {/* Idle State */}
        {!loading && query.trim() === '' && results.length === 0 && (
           <div className="empty-panel">
             <VscSearch style={{ fontSize: "3rem", marginBottom: "1rem" }} />
             <p>Type something to start searching</p>
           </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="grid">
             {results.map((item, index) => (
                <MediaCard key={`search-${item.media_type}-${item.id}`} item={item} stagger={index % 6 * 0.05} />
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

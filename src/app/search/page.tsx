'use client';

import { useState, useEffect } from 'react';
import { VscSearch } from 'react-icons/vsc';
import Aurora from '@/components/ui/Aurora';
import MediaCard from '@/components/MediaCard';
import type { TMDBMediaItem } from '@/lib/tmdb';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBMediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        if (data.results) {
          setResults(data.results);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Aurora 
          colorStops={["#0a090c", "#1e1e24", "#444444"]} 
          blend={0.5} 
          amplitude={1.0} 
          speed={0.2} 
        />
      </div>

      <div className="page-wrapper container" style={{ position: "relative", zIndex: 1, paddingBottom: "100px", paddingTop: "6rem" }}>
        {/* Search Input */}
        <div style={{ maxWidth: 800, margin: "0 auto 4rem", position: "relative" }}>
           <VscSearch style={{ position: "absolute", left: "24px", top: "50%", transform: "translateY(-50%)", fontSize: "2rem", opacity: 0.5, color: 'white' }} />
           <input 
             type="text" 
             placeholder="Search for movies, TV series..." 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             style={{
               width: "100%",
               padding: "1.5rem 1.5rem 1.5rem 5.5rem",
               fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
               borderRadius: "24px",
               border: "1px solid rgba(255, 255, 255, 0.15)",
               background: "rgba(255, 255, 255, 0.05)",
               color: "white",
               outline: "none",
               boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
               backdropFilter: "blur(12px)",
               transition: "border-color 0.3s ease"
             }}
             onFocus={(e) => e.target.style.borderColor = "rgba(255,255,255,0.4)"}
             onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
           />
        </div>
        
        {/* Loading State */}
        {loading && query.trim() !== '' && (
           <div style={{ textAlign: "center", padding: "2rem", opacity: 0.5, fontSize: "1.2rem", display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div className="spinner" style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <style jsx>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
              `}</style>
              <span>Searching...</span>
           </div>
        )}

        {/* Empty State */}
        {!loading && query.trim() !== '' && results.length === 0 && (
           <div style={{ textAlign: "center", padding: "4rem", opacity: 0.5 }}>
             <p style={{ fontSize: "1.5rem" }}>No results found for "{query}"</p>
             <p style={{ marginTop: '0.5rem' }}>Try modifying your search terms.</p>
           </div>
        )}

        {/* Idle State */}
        {!loading && query.trim() === '' && results.length === 0 && (
           <div style={{ textAlign: "center", padding: "4rem", opacity: 0.3 }}>
             <VscSearch style={{ fontSize: "4rem", marginBottom: "1rem" }} />
             <p style={{ fontSize: "1.2rem" }}>Type something to start searching</p>
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

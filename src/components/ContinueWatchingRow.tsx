'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getWatchHistory, type HistoryItem } from '@/lib/history';
import { getImageUrl } from '@/lib/tmdb';
import { generateSlug } from '@/lib/utils';
import { removeFromWatchHistory } from '@/lib/history';

export default function ContinueWatchingRow() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  useEffect(() => {
    const updateHistory = () => {
      setHistory(getWatchHistory());
    };

    updateHistory();
    setMounted(true);

    window.addEventListener("historyUpdated", updateHistory);
    return () => window.removeEventListener("historyUpdated", updateHistory);
  }, []);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 20);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      checkScroll();
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [history]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleRemove = (e: React.MouseEvent, id: string | number) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromWatchHistory(id);
  };

  if (!mounted || history.length === 0) return null;

  return (
    <div style={{ marginBottom: '4rem', position: 'relative' }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 600, marginBottom: '1.5rem', paddingLeft: '1rem' }}>
        <span style={{ color: 'var(--primary)' }}>▶️</span> Continue Watching
      </h2>

      <div style={{ position: 'relative', overflow: 'hidden' }} className="cw-container">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            style={{
              position: 'absolute',
              left: 0,
              top: '40%',
              zIndex: 10,
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              border: 'none',
              padding: '1.5rem 0.5rem',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              borderRadius: '0 8px 8px 0',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(157, 0, 255, 0.4)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
          >
            ❮
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            style={{
              position: 'absolute',
              right: 0,
              top: '40%',
              zIndex: 10,
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              border: 'none',
              padding: '1.5rem 0.5rem',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              borderRadius: '8px 0 0 8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(157, 0, 255, 0.4)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
          >
            ❯
          </button>
        )}

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: '1.2rem',
            padding: '1rem 1rem 3rem',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {history.map((item) => {
            const mediaType = item.type === 'tv' ? 'tv' : 'movie';

            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={`/media/${mediaType}/${generateSlug(item.id, item.title)}`}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: '160px',
                  scrollSnapAlign: 'start',
                  transition: 'transform 0.3s ease',
                  display: 'block',
                }}
                className="cw-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px) scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                {/* Remove Button */}
                <button
                  onClick={(e) => handleRemove(e, item.id)}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    zIndex: 3,
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                    opacity: 0,
                    transition: 'opacity 0.2s ease, background 0.2s ease',
                    backdropFilter: 'blur(4px)',
                  }}
                  className="cw-remove-btn"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 50, 50, 0.8)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                >
                  ✕
                </button>

                {/* Poster Image */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '2/3',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 1,
                    boxShadow: '0 10px 20px rgba(0,0,0,0.5), 0 0 15px rgba(157, 0, 255, 0.2)',
                    background: 'rgba(255,255,255,0.05)',
                  }}
                >
                  {item.poster_path ? (
                    <img
                      src={getImageUrl(item.poster_path, 'w342')}
                      alt={item.title}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                      No Image
                    </div>
                  )}
                </div>

                {/* Title */}
                <p style={{
                  marginTop: '0.6rem',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.85)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'center',
                }}>
                  {item.title}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Hover styles for remove button */}
      <style jsx>{`
        :global(.cw-card:hover .cw-remove-btn) {
          opacity: 1 !important;
        }
        :global(.cw-container div::-webkit-scrollbar) {
          display: none;
        }
      `}</style>
    </div>
  );
}

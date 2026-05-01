'use client'

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { getImageUrl, type TMDBMediaItem } from '@/lib/tmdb';
import { generateSlug } from "@/lib/utils";

export default function Top10Row({ items, title, maxItems }: { items: TMDBMediaItem[]; title?: string; maxItems?: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const limit = maxItems || 10;
  // Show up to the configured maxItems
  const displayItems = items.slice(0, limit);

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
  }, []);

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

  return (
    <div style={{ marginBottom: '4rem', position: 'relative' }}>
      <h2 style={{ fontSize: '1.95rem', fontWeight: 700, marginBottom: '1.8rem', paddingLeft: '1rem' }}>
        <span style={{ color: 'var(--primary)' }}>🏆</span> {title || 'Top 10 in India Today'}
      </h2>
      
      <div style={{ position: 'relative', overflow: 'hidden' }} className="top10-container">
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
            gap: '2.5rem',
            padding: '1rem 1rem 3rem',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {displayItems.map((item, index) => {
            const rank = index + 1;
            const isTop10 = rank <= limit;
            const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
            const title = (item as any).title || (item as any).name;

            return (
              <Link 
                key={item.id} 
                href={item.preferredStream ? `/media/${mediaType}/${generateSlug(item.id, title)}?stream=${item.preferredStream}` : `/media/${mediaType}/${generateSlug(item.id, title)}`}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: '160px',
                  scrollSnapAlign: 'start',
                  transition: 'transform 0.3s ease',
                  display: 'block',
                }}
                className="top10-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px) scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                {/* Massive Number (Only for Top 10) */}
                {isTop10 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '-35px',
                      bottom: '-15px',
                      fontSize: '150px',
                      lineHeight: '150px',
                      fontWeight: 900,
                      color: '#0b0515',
                      WebkitTextStroke: '2px rgba(255, 255, 255, 0.4)',
                      zIndex: 0,
                      userSelect: 'none',
                      letterSpacing: '-10px',
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                  >
                    {rank}
                  </div>
                )}

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
                    marginLeft: isTop10 ? '20px' : '0'
                  }}
                >
                  {item.poster_path ? (
                    <img
                      src={getImageUrl(item.poster_path, 'w342')}
                      alt={title}
                      loading={index < 5 ? "eager" : "lazy"}
                      fetchPriority={index < 5 ? "high" : "auto"}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                     <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

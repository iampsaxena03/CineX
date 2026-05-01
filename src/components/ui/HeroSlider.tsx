'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getBackdropUrl, type TMDBMediaItem } from '@/lib/tmdb';
import { generateSlug } from "@/lib/utils";

export default function HeroSlider({ items }: { items: TMDBMediaItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance
  useEffect(() => {
    if (!items || items.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6000); // 6 seconds per slide
    return () => clearInterval(timer);
  }, [items]);

  const handleDotClick = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div 
      className="hero-slider"
      style={{
        position: 'relative',
        width: '100vw',
        left: '50%',
        transform: 'translateX(-50%)',
        height: 'clamp(60vh, 56.25vw, 90vh)', // 16:9 aspect ratio, but min 60vh for mobile
        overflow: 'hidden',
        marginBottom: '4rem',
        marginTop: '-6rem' // Pull up under the navbar
      }}
    >
      {items.map((item, index) => {
        const isActive = index === currentIndex;
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        const title = (item as any).title || (item as any).name;
        const backdropUrl = getBackdropUrl(item.backdrop_path);

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: isActive ? 1 : 0,
              visibility: isActive ? 'visible' : 'hidden',
              transition: 'opacity 0.8s ease-in-out, visibility 0.8s',
              zIndex: isActive ? 1 : 0,
            }}
          >
            {/* Background Image */}
            {backdropUrl ? (
              <img
                src={backdropUrl}
                alt={title}
                loading={index === 0 ? "eager" : "lazy"}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  filter: 'brightness(0.8)',
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--surface-dark)' }} />
            )}

            {/* Gradient Overlay for Text Readability */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, var(--background) 0%, rgba(11,5,21,0.6) 40%, rgba(11,5,21,0.2) 100%)',
                pointerEvents: 'none',
              }}
            />
            
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to right, rgba(11,5,21,0.8) 0%, rgba(11,5,21,0) 50%)',
                pointerEvents: 'none',
              }}
            />

            {/* Content Container */}
            <div className="container" style={{
              position: 'absolute',
              bottom: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              zIndex: 2,
              padding: '0 1.5rem'
            }}>
              <div style={{
                maxWidth: '600px',
                transform: isActive ? 'translateY(0)' : 'translateY(20px)',
                opacity: isActive ? 1 : 0,
                transition: 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s, opacity 0.8s ease 0.2s',
              }}>
                {/* Optional Media Type Badge */}
                <span style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--primary)',
                  marginBottom: '1rem',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {mediaType}
                </span>

                <h1 style={{
                  fontSize: 'clamp(2rem, 5vw, 4rem)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  marginBottom: '1rem',
                  color: '#ffffff',
                  textShadow: '0 4px 12px rgba(0,0,0,0.8)'
                }}>
                  {title}
                </h1>
                
                <p style={{
                  fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)',
                  lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.9)',
                  marginBottom: '2rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  maxWidth: '600px'
                }}>
                  {item.overview}
                </p>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <Link
                    href={item.preferredStream ? `/media/${mediaType}/${generateSlug(item.id, title)}?stream=${item.preferredStream}` : `/media/${mediaType}/${generateSlug(item.id, title)}`}
                    style={{
                      background: 'var(--primary)',
                      color: '#ffffff',
                      padding: '12px 32px',
                      borderRadius: '30px',
                      fontWeight: 700,
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 15px rgba(157, 0, 255, 0.4)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(157, 0, 255, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(157, 0, 255, 0.4)';
                    }}
                  >
                    <span>▶</span> Watch Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Dots */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 10,
      }}>
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            style={{
              width: index === currentIndex ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: index === currentIndex ? 'var(--primary)' : 'rgba(255,255,255,0.3)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

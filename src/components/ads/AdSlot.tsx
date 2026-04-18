'use client';

import { useEffect, useState } from 'react';
import AdBanner from './AdBanner';

interface AdSlotProps {
  /**
   * "leaderboard" = sleek horizontal 728x90 (always, even on mobile it stays horizontal)
   * "banner"      = responsive: 728x90 on desktop, 300x250 on mobile (default)
   */
  variant?: 'leaderboard' | 'banner';
}

/**
 * Responsive ad slot wrapper.
 * - "leaderboard": always shows the slim 728x90 banner (scales down on small screens)
 * - "banner": shows 728x90 on desktop, 300x250 rectangle on mobile
 * 
 * Collapses to nothing if AdBanner detects an ad-blocker.
 */
export default function AdSlot({ variant = 'banner' }: AdSlotProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!mounted) return null;

  // Leaderboard variant: always the slim 728x90, just scale it on mobile
  if (variant === 'leaderboard') {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          padding: '0.75rem 0',
          // On mobile, scale the 728px-wide banner to fit the viewport
          ...(isMobile ? {
            transform: `scale(${Math.min(1, (window.innerWidth - 32) / 728)})`,
            transformOrigin: 'center center',
          } : {}),
        }}
      >
        <AdBanner
          adKey="636ac374dbb99b948710af913b4a7592"
          width={728}
          height={90}
          format="iframe"
        />
      </div>
    );
  }

  // Banner variant: responsive 728x90 desktop / 300x250 mobile
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: '1rem 0',
      }}
    >
      {isMobile ? (
        <AdBanner
          adKey="87b1f98e2b43417d714893dfa11c7e9f"
          width={300}
          height={250}
          format="iframe"
        />
      ) : (
        <AdBanner
          adKey="636ac374dbb99b948710af913b4a7592"
          width={728}
          height={90}
          format="iframe"
        />
      )}
    </div>
  );
}

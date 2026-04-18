'use client';

import { useEffect, useState } from 'react';
import AdBanner from './AdBanner';

interface AdSlotProps {
  /**
   * "slim"    = 320x50 on mobile, 728x90 on desktop (sleek, under Top 10)
   * "banner"  = 300x250 on mobile, 728x90 on desktop (square block, under Trending)
   */
  variant?: 'slim' | 'banner';
}

/**
 * Responsive ad slot wrapper.
 * - "slim":   Mobile → 320x50 compact banner, Desktop → 728x90 leaderboard
 * - "banner": Mobile → 300x250 square box,    Desktop → 728x90 leaderboard
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

  if (variant === 'slim') {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          padding: '0.75rem 0',
        }}
      >
        {isMobile ? (
          <AdBanner
            adKey="47487de96b361fef4cd73964201393c1"
            width={320}
            height={50}
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

  // Banner variant: 300x250 on mobile, 728x90 on desktop
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

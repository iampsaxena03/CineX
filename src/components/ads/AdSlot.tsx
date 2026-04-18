'use client';

import { useEffect, useState } from 'react';
import AdBanner from './AdBanner';

/**
 * Responsive ad slot that shows 728x90 on desktop and 300x250 on mobile.
 * Wraps ad in a subtle, themed container so it doesn't look jarring.
 */
export default function AdSlot() {
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

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: '1rem 0',
        opacity: 0.85,
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

'use client';

import { useEffect, useRef, useState } from 'react';

interface AdBannerProps {
  adKey: string;
  width: number;
  height: number;
  format?: string;
}

/**
 * Safely injects an Adsterra banner ad.
 * Uses direct DOM manipulation to avoid React virtual DOM conflicts
 * with ad network scripts that use document.write().
 * 
 * Ad-blocker resilient: if the ad fails to load (blocked/timeout),
 * the container collapses to 0 height so no empty space is left.
 */
export default function AdBanner({ adKey, width, height, format = 'iframe' }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);
  const [adFailed, setAdFailed] = useState(false);

  useEffect(() => {
    if (!adRef.current || injectedRef.current) return;
    injectedRef.current = true;

    const confScript = document.createElement('script');
    confScript.type = 'text/javascript';
    confScript.innerHTML = `
      atOptions = {
        'key' : '${adKey}',
        'format' : '${format}',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    `;

    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;
    invokeScript.async = true;

    // If the script itself is blocked by adblocker, it'll fire onerror
    invokeScript.onerror = () => setAdFailed(true);

    adRef.current.appendChild(confScript);
    adRef.current.appendChild(invokeScript);

    // Check after 5s if ANY child content was injected beyond our 2 scripts.
    // Adsterra can inject iframes, divs, ins tags, etc. — so we check
    // if there are more than 2 children (our config + invoke scripts).
    const checkTimer = setTimeout(() => {
      if (!adRef.current) return;
      if (adRef.current.childElementCount <= 2) {
        // Only our two scripts exist, no ad was rendered
        setAdFailed(true);
      }
    }, 5000);

    return () => {
      clearTimeout(checkTimer);
      injectedRef.current = false;
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [adKey, width, height, format]);

  // If ad was blocked, render nothing — no empty space
  if (adFailed) return null;

  return (
    <div
      ref={adRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        width: '100%',
        minHeight: height,
      }}
    />
  );
}

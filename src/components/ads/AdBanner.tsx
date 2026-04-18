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
  const [adLoaded, setAdLoaded] = useState(false);
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

    // Check after 3s if any iframe/ins/img was injected (ad loaded)
    // If not, the ad was likely blocked — collapse the container
    const checkTimer = setTimeout(() => {
      if (!adRef.current) return;
      const hasAdContent = adRef.current.querySelector('iframe, ins, img, .adsbygoogle');
      if (hasAdContent) {
        setAdLoaded(true);
      } else {
        setAdFailed(true);
      }
    }, 3000);

    return () => {
      clearTimeout(checkTimer);
      injectedRef.current = false;
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [adKey, width, height, format]);

  // If ad was blocked, render nothing
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
        // Only reserve space after the ad has loaded; otherwise keep it minimal
        minHeight: adLoaded ? height : 0,
        transition: 'min-height 0.3s ease, opacity 0.3s ease',
        opacity: adLoaded ? 1 : 0,
      }}
    />
  );
}

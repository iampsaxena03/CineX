'use client';

import { useEffect, useRef } from 'react';

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
 */
export default function AdBanner({ adKey, width, height, format = 'iframe' }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

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

    adRef.current.appendChild(confScript);
    adRef.current.appendChild(invokeScript);

    return () => {
      // Cleanup on unmount
      injectedRef.current = false;
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, [adKey, width, height, format]);

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

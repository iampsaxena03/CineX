'use client';

import { useEffect, useRef, useState } from 'react';

interface AdBannerProps {
  adKey: string;
  width: number;
  height: number;
  format?: string;
}

/**
 * Safely renders an Adsterra banner ad inside an isolated iframe.
 * 
 * Each ad gets its own JavaScript scope via a sandboxed iframe, which
 * prevents the global `atOptions` collision that occurs when multiple
 * Adsterra ads are on the same page (the second ad would overwrite the
 * first ad's atOptions before invoke.js could read it).
 * 
 * Ad-blocker resilient: if the ad fails to load after 5s, the container
 * collapses to show no empty space.
 */
export default function AdBanner({ adKey, width, height, format = 'iframe' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);
  const [adFailed, setAdFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current || injectedRef.current) return;
    injectedRef.current = true;

    // Create an isolated iframe so each ad gets its own JS global scope
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `border:none;overflow:hidden;width:${width}px;height:${height}px;display:block;`;
    iframe.scrolling = 'no';
    iframe.setAttribute('frameborder', '0');

    containerRef.current.appendChild(iframe);

    // Write the ad code into the iframe's own document
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write([
        '<!DOCTYPE html><html><head>',
        '<base target="_blank">',
        '<style>*{margin:0;padding:0;}body{overflow:hidden;}</style>',
        '</head><body>',
        '<script>',
        `atOptions={'key':'${adKey}','format':'${format}','height':${height},'width':${width},'params':{}};`,
        '<\/script>',
        `<script src="//www.highperformanceformat.com/${adKey}/invoke.js"><\/script>`,
        '</body></html>',
      ].join(''));
      iframeDoc.close();
    }

    // Ad-blocker check: if nothing rendered after 5s, collapse
    const checkTimer = setTimeout(() => {
      if (!containerRef.current) return;
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body && doc.body.childElementCount <= 2) {
          setAdFailed(true);
        }
      } catch {
        // Cross-origin means the ad network redirected → ad is working
      }
    }, 5000);

    return () => {
      clearTimeout(checkTimer);
      injectedRef.current = false;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [adKey, width, height, format]);

  if (adFailed) return null;

  return (
    <div
      ref={containerRef}
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

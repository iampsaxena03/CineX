'use client';

import { useEffect, useRef } from 'react';

/**
 * Injects the Adsterra Native Banner ad.
 * Native banners render content-style ads that blend with the page.
 */
export default function AdNative() {
  const adRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (!adRef.current || injectedRef.current) return;
    injectedRef.current = true;

    const invokeScript = document.createElement('script');
    invokeScript.async = true;
    invokeScript.setAttribute('data-cfasync', 'false');
    invokeScript.src = 'https://pl29183322.profitablecpmratenetwork.com/1f7c7fa6bbdd7b13a2f004f0b8e67f34/invoke.js';

    adRef.current.appendChild(invokeScript);

    return () => {
      injectedRef.current = false;
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div ref={adRef} style={{ width: '100%', overflow: 'hidden' }}>
      <div id="container-1f7c7fa6bbdd7b13a2f004f0b8e67f34" />
    </div>
  );
}

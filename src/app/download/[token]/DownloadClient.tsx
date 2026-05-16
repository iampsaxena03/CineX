'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { VscDesktopDownload, VscError } from 'react-icons/vsc';
import AdBanner from '@/components/ads/AdBanner';
import AdNative from '@/components/ads/AdNative';
import styles from './download.module.css';

interface DownloadClientProps {
  token: string;
}

interface Meta {
  u: string;
  t: string;
  q: string;
  s: string;
  p: string;
}

export default function DownloadClient({ token }: DownloadClientProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(10);
  const [isReady, setIsReady] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  
  const injectedAds = useRef(false);

  // 1. Decode token metadata on mount for immediate display
  useEffect(() => {
    try {
      const payloadB64 = token.split('.')[0];
      if (!payloadB64) throw new Error('Invalid token');
      
      const json = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
      setMeta({
        u: json.u,
        t: json.t,
        q: json.q,
        s: json.s,
        p: json.p
      });
    } catch (err) {
      console.error('Token decode error:', err);
      setError('Invalid or corrupt download link.');
      setTimeout(() => router.push('/'), 3000);
    }
  }, [token, router]);

  // 2. Timer & Ad Injection
  useEffect(() => {
    if (error || isReady) return;

    // Countdown logic
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Ad Injection (Popunder and Social Bar)
    if (!injectedAds.current) {
      injectedAds.current = true;
      
      // Social Bar
      const socialScript = document.createElement('script');
      socialScript.src = 'https://eagerdazzle.com/5f/69/5d/5f695dea02fd6964afe023097b2af686.js';
      socialScript.async = true;
      document.body.appendChild(socialScript);

      // Popunder
      const popScript = document.createElement('script');
      popScript.src = 'https://eagerdazzle.com/ab/84/54/ab8454e896335fcc65131264fa488955.js';
      popScript.async = true;
      document.body.appendChild(popScript);

      // Native Ad
      const nativeScript = document.createElement('script');
      nativeScript.src = 'https://eagerdazzle.com/1f7c7fa6bbdd7b13a2f004f0b8e67f34/invoke.js';
      nativeScript.async = true;
      nativeScript.setAttribute('data-cfasync', 'false');
      document.body.appendChild(nativeScript);
    }

    return () => clearInterval(timer);
  }, [error, isReady]);

  const handleTimerComplete = async () => {
    setIsResolving(true);
    try {
      const res = await fetch(`/api/download/resolve?token=${token}`);
      const data = await res.json();
      
      if (data.success) {
        setResolvedUrl(data.url);
        setIsReady(true);
      } else {
        setError(data.error || 'Link expired or invalid. Please go back and try again.');
      }
    } catch (err) {
      setError('Network error. Failed to resolve download link.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleDownloadClick = () => {
    if (!resolvedUrl) return;
    
    // 1. Open actual download in new tab
    window.open(resolvedUrl, '_blank');
    
    // 2. Redirect current page to Adsterra Smartlink
    window.location.href = 'https://eagerdazzle.com/tsy4jdcf?key=a1098a5f49912838eff6c5dd7f197787';
  };

  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.mainCard}>
          <div className={styles.errorState}>
            <VscError size={64} />
            <h2>Oops!</h2>
            <p>{error}</p>
            <button className="btn" onClick={() => router.push('/')}>Go to Homepage</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Side Ads (Desktop Only) */}
      <div className={styles.sideAdLeft}>
        <AdBanner zoneId="87b1f98e2b43417d714893dfa11c7e9f" width={300} height={250} />
      </div>
      <div className={styles.sideAdRight}>
        <AdBanner zoneId="87b1f98e2b43417d714893dfa11c7e9f" width={300} height={250} />
      </div>

      <div className={styles.mainCard}>
        {meta && (
          <div className={styles.mediaInfo}>
            {meta.p && <img src={meta.p} alt={meta.t} className={styles.poster} />}
            <div>
              <h1 className={styles.title}>{meta.t}</h1>
              <div className={styles.meta}>
                <span className={styles.tag}>{meta.q}</span>
                {meta.s && <span className={styles.tag}>{meta.s}</span>}
              </div>
            </div>
          </div>
        )}

        {!isReady ? (
          <>
            <div className={styles.timerSection}>
              <div 
                className={styles.timerRing} 
                style={{ '--progress': (timeLeft / 10) * 100 } as any}
              />
              <div className={styles.timerNumber}>{timeLeft}</div>
            </div>
            <p className={styles.statusText}>
              {isResolving ? 'Finalizing your link...' : 'Your download is preparing...'}
            </p>
          </>
        ) : (
          <div className={styles.readyContent}>
            <div className={styles.readyIcon}>✅</div>
            <h2>Your Link is Ready!</h2>
            <button className={styles.dlButton} onClick={handleDownloadClick}>
              <VscDesktopDownload size={24} />
              DOWNLOAD NOW
            </button>
          </div>
        )}

        {/* Mobile Banner 320x50 */}
        <div className="md:hidden">
          <div className={styles.adContainer}>
            <AdBanner zoneId="47487de96b361fef4cd73964201393c1" width={320} height={50} />
          </div>
        </div>
        
        {/* Desktop Leaderboard 728x90 */}
        <div className="hidden md:flex">
          <div className={styles.adContainer}>
            <AdBanner zoneId="636ac374dbb99b948710af913b4a7592" width={728} height={90} />
          </div>
        </div>
      </div>

      {/* Native Ad at Bottom */}
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <AdNative />
      </div>
      
      {/* Adsterra Native Section (eagerdazzle version) */}
      <div className={styles.adContainer}>
         <div id="container-1f7c7fa6bbdd7b13a2f004f0b8e67f34"></div>
      </div>
    </div>
  );
}

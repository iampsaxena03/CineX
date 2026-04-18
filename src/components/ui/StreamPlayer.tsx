'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { VscScreenFull } from 'react-icons/vsc'

interface StreamPlayerProps {
  embedUrl: string | null | undefined
  isPaused?: boolean
  startTime?: number
}

export interface StreamPlayerRef {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setVolume: (level: number) => void
  setMute: (muted: boolean) => void
  getStatus: () => void
}

const VIDFAST_ORIGINS = [
  'https://vidfast.pro',
  'https://vidfast.in',
  'https://vidfast.io',
  'https://vidfast.me',
  'https://vidfast.net',
  'https://vidfast.pm',
  'https://vidfast.xyz'
]

const VIDLINK_ORIGIN = 'https://vidlink.pro'
const VIDSRC_ORIGIN = 'https://vidsrc.mov'

const StreamPlayer = forwardRef<StreamPlayerRef, StreamPlayerProps>(({ embedUrl, isPaused, startTime }, ref) => {
  const [loaded, setLoaded] = useState(false)
  const [pipSupported, setPipSupported] = useState(false)
  const [isPip, setIsPip] = useState(false)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pipWindowRef = useRef<any>(null)

  // Expose player commands via ref
  useImperativeHandle(ref, () => ({
    play: () => {
      iframeRef.current?.contentWindow?.postMessage({ command: 'play', action: 'play' }, '*')
    },
    pause: () => {
      iframeRef.current?.contentWindow?.postMessage({ command: 'pause', action: 'pause' }, '*')
    },
    seek: (time: number) => {
      iframeRef.current?.contentWindow?.postMessage({ command: 'seek', action: 'seek', time }, '*')
    },
    setVolume: (level: number) => {
      iframeRef.current?.contentWindow?.postMessage({ command: 'volume', action: 'volume', level }, '*')
    },
    setMute: (muted: boolean) => {
      iframeRef.current?.contentWindow?.postMessage({ command: 'mute', action: 'mute', muted }, '*')
    },
    getStatus: () => {
      iframeRef.current?.contentWindow?.postMessage({ command: 'getStatus', action: 'getStatus' }, '*')
    }
  }))

  // Listen for messages from players
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { origin, data } = event
      
      const isVidfast = VIDFAST_ORIGINS.includes(origin)
      const isVidlink = origin === VIDLINK_ORIGIN
      const isVidsrc = origin === VIDSRC_ORIGIN

      if (!isVidfast && !isVidlink && !isVidsrc) return
      if (!data) return

      // Handle Progress Tracking (MEDIA_DATA)
      if (data.type === 'MEDIA_DATA') {
        const storageKey = isVidfast ? 'vidFastProgress' : 'vidLinkProgress'
        try {
          localStorage.setItem(storageKey, JSON.stringify(data.data))
          // Clean up older items proactively
          import('@/lib/progressManager').then(mod => mod.cleanupProgressCache())
        } catch (e) {
          console.error('[StreamPlayer] Failed to save progress:', e)
        }
      }

      // Handle Player Events (Logging for now, can be used for UI updates later)
      if (data.type === 'PLAYER_EVENT') {
        // const { event: playerEvent, currentTime, duration } = data.data
        // console.log(`[StreamPlayer] Player ${playerEvent} at ${currentTime}s of ${duration}s`)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    if ('documentPictureInPicture' in window) {
      setPipSupported(true);
    }
  }, []);

  const togglePip = async () => {
    if (!playerContainerRef.current) return;
    
    // @ts-ignore
    if (!('documentPictureInPicture' in window)) return;
    const dpip = (window as any).documentPictureInPicture;

    try {
      if (isPip && pipWindowRef.current) {
        pipWindowRef.current.close();
        return;
      }

      // Open PiP window
      const pipWindow = await dpip.requestWindow({
        width: 800,
        height: 450,
      });

      pipWindowRef.current = pipWindow;
      setIsPip(true);

      // Copy styles
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = styleSheet.type;
          link.media = (styleSheet as any).media.mediaText;
          link.href = styleSheet.href || '';
          pipWindow.document.head.appendChild(link);
        }
      });

      // Move player node
      pipWindow.document.body.appendChild(playerContainerRef.current);

      pipWindow.addEventListener('pagehide', () => {
        setIsPip(false);
        // Move back to main document
        const placeholder = document.getElementById('pip-placeholder');
        if (placeholder && playerContainerRef.current) {
          placeholder.appendChild(playerContainerRef.current);
        }
        pipWindowRef.current = null;
      });

    } catch (e) {
      console.error('Failed to open PiP:', e);
    }
  };

  // Forcefully show the player after 3.5 seconds as a fallback.
  useEffect(() => {
    if (!embedUrl) return
    setLoaded(false)
    const timer = setTimeout(() => setLoaded(true), 3500)
    return () => clearTimeout(timer)
  }, [embedUrl])

  // --- Force Landscape on Fullscreen ---
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isFullscreen = document.fullscreenElement !== null;
      const orientation = (screen as any).orientation;

      if (isFullscreen && orientation && typeof orientation.lock === 'function') {
        try {
          await orientation.lock('landscape');
        } catch (error) {
          console.warn('Orientation lock failed:', error);
        }
      } else if (!isFullscreen && orientation && typeof orientation.unlock === 'function') {
        try {
          orientation.unlock();
        } catch (error) {
          console.warn('Orientation unlock failed:', error);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle isPaused synchronization
  useEffect(() => {
    if (!iframeRef.current?.contentWindow || !loaded) return;
    const msg = isPaused 
      ? { command: 'pause', action: 'pause' } 
      : { command: 'play', action: 'play' };
    iframeRef.current.contentWindow.postMessage(msg, '*');
  }, [isPaused, loaded]);

  if (!embedUrl) {
    return (
      <div className="stream-player" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0510' }}>
        <div style={{ textAlign: 'center', opacity: 0.5 }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 500 }}>No streaming source available</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Try switching to another provider.</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="stream-player" 
      style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}
    >
      {/* Loading Overlay */}
      <AnimatePresence>
        {!loaded && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'rgba(10, 5, 16, 0.8)',
              backdropFilter: 'blur(20px)',
              zIndex: 10
            }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--primary)',
                filter: 'blur(15px)',
                marginBottom: '2rem'
              }}
            />
            <p style={{ 
              fontSize: '1rem', 
              letterSpacing: '0.1em', 
              fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase'
            }}>
              Initializing Stream...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paused Overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'rgba(4, 1, 10, 0.4)',
              backdropFilter: 'blur(8px)',
              zIndex: 10
            }}
          >
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(15, 10, 25, 0.75)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', maxWidth: '300px' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Playback Paused</p>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>The stream is waiting for you while you share your story.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="pip-placeholder" style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div 
          ref={playerContainerRef} 
          style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}
        >
          {pipSupported && !isPip && (
            <button
              onClick={(e) => { e.stopPropagation(); togglePip(); }}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 50,
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(4px)',
                opacity: isPaused ? 0 : 1, // Hide in pause overlay
                pointerEvents: isPaused ? 'none' : 'auto'
              }}
            >
              <VscScreenFull /> Pop Out Player
            </button>
          )}
          
          <iframe
            ref={iframeRef}
            src={embedUrl}
            allowFullScreen
            frameBorder="0"
            allow="encrypted-media; fullscreen"
            {...(embedUrl?.includes('piexe411qok.com') ? { sandbox: "allow-scripts allow-same-origin allow-forms allow-presentation" } : {})}
            onLoad={() => setLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.8s ease'
            }}
          />
        </div>
      </div>
    </div>
  )
})

StreamPlayer.displayName = 'StreamPlayer'

export default StreamPlayer

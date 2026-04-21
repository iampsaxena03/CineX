'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { VscScreenFull } from 'react-icons/vsc'

interface StreamPlayerProps {
  embedUrl: string | null | undefined
  isPaused?: boolean
  startTime?: number
  directVideoObj?: { sources: {src: string, type: string, size?: number}[], subtitleUrl?: string }
  tmdbId?: string
  type?: 'movie' | 'tv'
  season?: number
  episode?: number
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

const StreamPlayer = forwardRef<StreamPlayerRef, StreamPlayerProps>(({ embedUrl, isPaused, startTime, directVideoObj, tmdbId, type, season, episode }, ref) => {
  const [loaded, setLoaded] = useState(false)
  const [pipSupported, setPipSupported] = useState(false)
  const [isPip, setIsPip] = useState(false)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const pipWindowRef = useRef<any>(null)

  // Raw Plyr refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const plyrInstanceRef = useRef<any>(null)
  const startTimeSeeked = useRef(false)
  const progressThrottleRef = useRef(0)
  const [nativeReady, setNativeReady] = useState(false)

  // Helper to get the raw Plyr or video element
  const getPlayer = useCallback(() => plyrInstanceRef.current, [])

  // Expose player commands via ref
  useImperativeHandle(ref, () => ({
    play: () => {
      const p = getPlayer()
      if (p) { try { p.play() } catch(e){} }
      else { iframeRef.current?.contentWindow?.postMessage({ command: 'play', action: 'play' }, '*') }
    },
    pause: () => {
      const p = getPlayer()
      if (p) { try { p.pause() } catch(e){} }
      else { iframeRef.current?.contentWindow?.postMessage({ command: 'pause', action: 'pause' }, '*') }
    },
    seek: (time: number) => {
      const p = getPlayer()
      if (p) { try { p.currentTime = time } catch(e){} }
      else { iframeRef.current?.contentWindow?.postMessage({ command: 'seek', action: 'seek', time }, '*') }
    },
    setVolume: (level: number) => {
      const p = getPlayer()
      if (p) { try { p.volume = level } catch(e){} }
      else { iframeRef.current?.contentWindow?.postMessage({ command: 'volume', action: 'volume', level }, '*') }
    },
    setMute: (muted: boolean) => {
      const p = getPlayer()
      if (p) { try { p.muted = muted } catch(e){} }
      else { iframeRef.current?.contentWindow?.postMessage({ command: 'mute', action: 'mute', muted }, '*') }
    },
    getStatus: () => {
      if (!directVideoObj) {
        iframeRef.current?.contentWindow?.postMessage({ command: 'getStatus', action: 'getStatus' }, '*')
      }
    }
  }))

  // Listen for messages from iframe providers
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
    if (!embedUrl || directVideoObj) return
    setLoaded(false)
    const timer = setTimeout(() => setLoaded(true), 3500)
    return () => clearTimeout(timer)
  }, [embedUrl, directVideoObj])

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
    const p = getPlayer()
    if (p) {
      try { if (isPaused) p.pause(); else p.play(); } catch(e){}
      return;
    }

    if (!iframeRef.current?.contentWindow || !loaded) return;
    const msg = isPaused 
      ? { command: 'pause', action: 'pause' } 
      : { command: 'play', action: 'play' };
    iframeRef.current.contentWindow.postMessage(msg, '*');
  }, [isPaused, loaded, getPlayer]);

  // ============================================================
  // RAW PLYR INITIALIZATION (replaces buggy plyr-react wrapper)
  // ============================================================
  useEffect(() => {
    if (!directVideoObj || !videoRef.current) return

    let plyrInstance: any = null
    let destroyed = false
    startTimeSeeked.current = false
    setNativeReady(false)

    const qualityOptions = directVideoObj.sources
      .map(s => s.size || 0)
      .filter(q => q > 0)
      .sort((a, b) => b - a)

    const bestQuality = qualityOptions[0] || 1080

    // Build a map: quality -> src URL
    const qualityMap: Record<number, string> = {}
    directVideoObj.sources.forEach(s => {
      if (s.size) qualityMap[s.size] = s.src
    })

    // Dynamically import plyr (browser only) + inject CSS
    import('plyr').then((PlyrModule) => {
      // Inject Plyr CSS once
      if (!document.getElementById('plyr-css')) {
        const link = document.createElement('link')
        link.id = 'plyr-css'
        link.rel = 'stylesheet'
        link.href = 'https://cdn.plyr.io/3.7.8/plyr.css'
        document.head.appendChild(link)
      }
      // Inject sizing fix CSS
      if (!document.getElementById('plyr-fix-css')) {
        const style = document.createElement('style')
        style.id = 'plyr-fix-css'
        style.textContent = `
          .plyr { height: 100% !important; }
          .plyr video { height: 100% !important; transition: object-fit 0.3s ease; }
          .plyr__video-wrapper { height: 100% !important; padding-bottom: 0 !important; }
        `
        document.head.appendChild(style)
      }

      const PlyrClass = PlyrModule.default
      if (!videoRef.current || destroyed) return

      // Set source AFTER Plyr CSS is ready, right before init
      videoRef.current.src = qualityMap[bestQuality] || directVideoObj.sources[0]?.src || ''

      plyrInstance = new PlyrClass(videoRef.current, {
        controls: [
          'play-large', 'play', 'progress', 'current-time', 'duration',
          'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
        ],
        settings: ['captions', 'quality', 'speed'],
        quality: {
          default: bestQuality,
          options: qualityOptions,
          forced: true,
          onChange: (newQuality: number) => {
            const newSrc = qualityMap[newQuality]
            if (newSrc && videoRef.current) {
              const currentTime = videoRef.current.currentTime
              const wasPlaying = !videoRef.current.paused
              videoRef.current.src = newSrc
              // Wait for the new source to be loadable before seeking/playing
              videoRef.current.addEventListener('loadedmetadata', function onMeta() {
                videoRef.current?.removeEventListener('loadedmetadata', onMeta)
                if (videoRef.current) videoRef.current.currentTime = currentTime
                if (wasPlaying) videoRef.current?.play().catch(() => {})
              })
              videoRef.current.load()
            }
          }
        },
        captions: { active: true, language: 'en', update: true },
        invertTime: false,
        keyboard: { focused: true, global: true },
      })

      plyrInstanceRef.current = plyrInstance

      // Wait for the video to be ready, then seek + play
      plyrInstance.on('canplay', () => {
        if (!startTimeSeeked.current && startTime && startTime > 0) {
          try { plyrInstance.currentTime = startTime } catch(e){}
          startTimeSeeked.current = true
        }
      })

      // Mark as visually ready once Plyr is mounted
      plyrInstance.on('ready', () => {
        setNativeReady(true)
        setLoaded(true)

        // Inject Crop/Fill button into Plyr Controls
        setTimeout(() => {
          const controls = videoRef.current?.closest('.plyr')?.querySelector('.plyr__controls');
          if (controls && !controls.querySelector('.custom-fill-btn')) {
            const btn = document.createElement('button');
            btn.className = 'plyr__controls__item plyr__control custom-fill-btn';
            btn.type = 'button';
            btn.title = 'Fill Screen';
            // Simple expand icon
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/></svg>`;
            btn.onclick = () => {
              const vid = videoRef.current;
              if (!vid) return;
              const isCover = vid.style.getPropertyValue('object-fit') === 'cover';
              if (isCover) {
                vid.style.setProperty('object-fit', 'contain', 'important');
              } else {
                vid.style.setProperty('object-fit', 'cover', 'important');
              }
            };
            // Insert exactly before the fullscreen button
            const fsBtn = controls.querySelector('[data-plyr="fullscreen"]');
            if (fsBtn) controls.insertBefore(btn, fsBtn);
            else controls.appendChild(btn);
          }
        }, 300);

        // Safe auto-play: try normal play, fallback to muted play (browser policy)
        const tryPlay = () => {
          if (!videoRef.current) return
          videoRef.current.play().catch(() => {
            // Browser blocked unmuted autoplay; try muted
            if (videoRef.current) {
              videoRef.current.muted = true
              videoRef.current.play().catch(() => {})
            }
          })
        }
        if (videoRef.current && videoRef.current.readyState >= 2) {
          tryPlay()
        } else if (videoRef.current) {
          videoRef.current.addEventListener('loadeddata', function onData() {
            videoRef.current?.removeEventListener('loadeddata', onData)
            tryPlay()
          })
        }
      })

      // Progress tracking (throttled to every 5 seconds)
      plyrInstance.on('timeupdate', () => {
        if (!tmdbId || !type) return
        const now = Date.now()
        if (now - progressThrottleRef.current < 5000) return
        progressThrottleRef.current = now

        try {
          const ct = plyrInstance.currentTime
          const dur = plyrInstance.duration
          if (!dur || dur <= 0) return

          const vlStr = localStorage.getItem('vidLinkProgress') || '{}'
          const vlData = JSON.parse(vlStr)
          const parsedId = tmdbId.toString()

          if (!vlData[parsedId]) vlData[parsedId] = { type }

          if (type === 'tv') {
            vlData[parsedId].last_season_watched = season?.toString() || '1'
            vlData[parsedId].last_episode_watched = episode?.toString() || '1'
            if (!vlData[parsedId].show_progress) vlData[parsedId].show_progress = {}
            const epKey = `s${season}e${episode}`
            vlData[parsedId].show_progress[epKey] = {
              progress: { watched: ct, duration: dur },
              last_updated: Date.now()
            }
          } else {
            vlData[parsedId].progress = { watched: ct, duration: dur }
            vlData[parsedId].last_updated = Date.now()
          }

          localStorage.setItem('vidLinkProgress', JSON.stringify(vlData))
        } catch(e) {
          console.error('[NativePlayer] Progress save failed', e)
        }
      })
    })

    return () => {
      destroyed = true
      if (plyrInstance) {
        try { plyrInstance.destroy() } catch(e){}
      }
      plyrInstanceRef.current = null
      setNativeReady(false)
    }
  // We intentionally only re-initialize when the source object identity changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directVideoObj])

  if (!embedUrl && !directVideoObj) {
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
      {/* Loading Overlay (only for iframe providers) */}
      <AnimatePresence>
        {!loaded && !directVideoObj && (
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
          {pipSupported && !isPip && !directVideoObj && (
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
                opacity: isPaused ? 0 : 1,
                pointerEvents: isPaused ? 'none' : 'auto'
              }}
            >
              <VscScreenFull /> Pop Out Player
            </button>
          )}
          
          {directVideoObj ? (
            <div style={{ width: '100%', height: '100%', opacity: nativeReady ? 1 : 0, transition: 'opacity 0.4s ease' }}>
              {/* Raw video element - Plyr attaches to this */}
              <video
                ref={videoRef}
                crossOrigin="anonymous"
                playsInline
                preload="auto"
                style={{ width: '100%', height: '100%' }}
              >
                {directVideoObj.subtitleUrl && (
                  <track
                    kind="captions"
                    label="English"
                    srcLang="en"
                    src={directVideoObj.subtitleUrl}
                    default
                  />
                )}
              </video>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={embedUrl!}
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
          )}
        </div>
      </div>
    </div>
  )
})

StreamPlayer.displayName = 'StreamPlayer'

export default StreamPlayer

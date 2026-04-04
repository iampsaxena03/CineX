'use client';

import React, { useEffect, useState, useRef, useCallback, useId } from 'react';
import { motion } from 'motion/react';
import { 
  VscPlayCircle, 
  VscMute, 
  VscUnmute, 
  VscLoading, 
  VscShare, 
  VscChevronDown,
  VscBookmark
} from 'react-icons/vsc';
import { MdBookmark } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import { getImageUrl } from '@/lib/tmdb';
import { ReelVideo } from '@/lib/reels';

// ─── Global YT types ─────────────────────────────────────────────────────────
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
    _ytApiCallbacks: Array<() => void>;
  }
}

// ─── Singleton YT API loader ──────────────────────────────────────────────────
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    if (!window._ytApiCallbacks) window._ytApiCallbacks = [];
    window._ytApiCallbacks.push(resolve);
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => {
        (window._ytApiCallbacks || []).forEach(cb => cb());
        window._ytApiCallbacks = [];
      };
    }
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface TrailerFeedClientProps {
  initialReels: ReelVideo[];
  initialPage: number;
}

// ─── Parent Feed ──────────────────────────────────────────────────────────────
export default function TrailerFeedClient({ initialReels, initialPage }: TrailerFeedClientProps) {
  const [reels, setReels]           = useState<ReelVideo[]>(initialReels);
  const [page, setPage]             = useState(initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [muted, setMuted]           = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef                = useRef<HTMLDivElement>(null);

  const fetchMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/tmdb/reels?page=${page + 1}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setReels(prev => [...prev, ...data]);
        setPage(p => p + 1);
      }
    } catch (e) {
      console.error('Failed to fetch more reels', e);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const idx = Math.round(containerRef.current.scrollTop / containerRef.current.offsetHeight);
    if (idx !== activeIndex) setActiveIndex(idx);
    if (idx >= reels.length - 4 && !loadingMore) fetchMore();
  }, [activeIndex, reels.length, loadingMore, fetchMore]);

  const handleVideoError = useCallback((id: string | number) => {
    console.warn(`Removing unavailable video: ${id}`);
    setReels(prev => prev.filter(r => r.id !== id));
  }, []);

  return (
    <>
      <style>{`.reels-wrap::-webkit-scrollbar{display:none}`}</style>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="reels-wrap"
        style={{
          height: '100dvh',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          background: '#000',
        }}
      >
        {reels.map((reel, i) => (
          <ReelSlide
            key={reel.id}
            reel={reel}
            slideIndex={i}
            isActive={i === activeIndex}
            isLast={i === reels.length - 1}
            isPrefetch={i >= activeIndex - 1 && i <= activeIndex + 1}
            muted={muted}
            onToggleMute={() => setMuted(m => !m)}
            onVideoError={handleVideoError}
          />
        ))}
      </div>

      {loadingMore && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
          padding: '8px 20px', borderRadius: 99, display: 'flex', gap: 10,
          alignItems: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <VscLoading size={18} />
          </motion.div>
          Loading more…
        </div>
      )}
    </>
  );
}

// ─── Single Reel Slide ────────────────────────────────────────────────────────
function ReelSlide({
  reel, slideIndex, isActive, isLast, isPrefetch, muted, onToggleMute, onVideoError
}: {
  reel: ReelVideo;
  slideIndex: number;
  isActive: boolean;
  isLast: boolean;
  isPrefetch: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onVideoError: (id: string | number) => void;
}) {
  const { item, video } = reel;
  const router = useRouter();
  // Stable unique DOM id for this player
  const playerId = `yt-player-${slideIndex}-${video.key}`;
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [apiReady, setApiReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasBuffered, setHasBuffered] = useState(false);

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    loadYouTubeAPI().then(() => setApiReady(true));
  }, []);

  // ── Init player only for active or adjacent slides ──
  useEffect(() => {
    let cancelled = false;
    
    // Unload the player if it's far away to save memory/bandwidth
    if (!isActive && !isPrefetch) {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        setReady(false);
      }
      return;
    }

    if (!apiReady || playerRef.current) return;

    loadYouTubeAPI().then(() => {
      if (cancelled || playerRef.current) return;
      playerRef.current = new window.YT.Player(playerId, {
        videoId: video.key,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1, // ALWAYS 1 to reliably bypass browser restrictions
          controls: 0,
          mute: 1, // ALWAYS 1 for autoplay policy
          loop: 1,
          playlist: video.key,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
        },
        events: {
          onReady: (e: any) => {
            if (cancelled) return;
            setReady(true);
            setDuration(e.target.getDuration());
            e.target.setPlaybackQuality(isActiveRef.current ? 'auto' : 'small');
          },
          onStateChange: (e: any) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setHasBuffered(true);
              if (!isActiveRef.current) {
                e.target.pauseVideo();
                setIsPlaying(false);
              } else {
                e.target.setPlaybackQuality('auto');
                setIsPlaying(true);
              }
            }
            if (e.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            }
            if (e.data === window.YT.PlayerState.ENDED) {
              e.target.seekTo(0);
              e.target.playVideo();
            }
          },
          onError: (e: any) => {
            // 2: invalid param, 5: HTML5 error, 100: not found/removed, 101/150: embedded playback disabled
            if ([2, 5, 100, 101, 150].includes(e.data)) {
              if (onVideoError) {
                  onVideoError(reel.id);
              }
            }
          }
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [playerId, video.key, apiReady, isActive, isPrefetch]);

  // ── Auto Play/Pause when slide becomes active ─────────────────────────────
  useEffect(() => {
    if (!ready || !playerRef.current) return;

    if (isActive) {
      if (playerRef.current.setPlaybackQuality) playerRef.current.setPlaybackQuality('auto');
      playerRef.current.playVideo();
      setIsPlaying(true);
    } else if (hasBuffered) {
      // If it's NOT active, but it has already finished its initial buffer -> Pause it!
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      setProgress(0);
    }
  }, [isActive, ready, hasBuffered]);

  // ── Mute / Unmute (NO reload) ───────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    if (muted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unMute();
      playerRef.current.setVolume(100);
    }
  }, [muted, ready]);

  // ── Progress ticker ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (isActive) {
      timerRef.current = setInterval(() => {
        const p = playerRef.current;
        if (!p?.getCurrentTime) return;
        const cur = p.getCurrentTime();
        const dur = p.getDuration();
        if (dur > 0) setProgress((cur / dur) * 100);
      }, 200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, ready]);

  // ── Seek on click ───────────────────────────────────────────────────────────
  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!playerRef.current || duration === 0) return;
    e.stopPropagation();
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    playerRef.current.seekTo(duration * pct, true);
    setProgress(pct * 100);
    if (!isPlaying) setIsPlaying(true);
  };

  // ── Share ───────────────────────────────────────────────────────────────────
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/media/${item.media_type || 'movie'}/${item.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const title = (item as any).title || (item as any).name || 'Unknown';
  const year  = ((item as any).release_date || (item as any).first_air_date || '').slice(0, 4);
  const rating = ((item as any).vote_average || 0).toFixed(1);

  return (
    <div style={{
      height: '100dvh', width: '100%',
      scrollSnapAlign: 'start', scrollSnapStop: 'always',
      position: 'relative', overflow: 'hidden',
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* ── Cinematic blurred background ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${getImageUrl(item.poster_path, 'w780')})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(60px) brightness(0.2)',
        transform: 'scale(1.3)', zIndex: 0,
      }} />

      {/* ── Video wrapper (smart vertical zoom) ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', height: '100%',
        maxWidth: 'calc(100dvh * 9 / 16)',
        background: '#000',
        boxShadow: '0 0 100px rgba(0,0,0,0.9)',
        overflow: 'hidden',
      }}>
        {/* Poster while loading */}
        {!ready && (
          <img
            src={getImageUrl(item.poster_path, 'w780')}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
          />
        )}

        {/* YT iframe container — sized to create vertical crop from 16:9 */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: '177.78%',   // 16/9 * 100%
          height: '177.78%',  // forces letterbox to be cropped
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}>
          <div id={playerId} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Interaction overlay (tap to toggle play/pause) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (playerRef.current && ready) {
              if (isPlaying) {
                playerRef.current.pauseVideo();
                setIsPlaying(false);
              } else {
                playerRef.current.playVideo();
                setIsPlaying(true);
              }
            }
          }}
          style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer' }}
        />

        {/* ── Top badge ── */}
        <div style={{
          position: 'absolute', top: 16, right: 16, zIndex: 20,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 99, padding: '5px 12px',
          display: 'flex', alignItems: 'center', gap: 7,
          pointerEvents: 'none',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--primary)',
            boxShadow: '0 0 8px var(--primary)',
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{
            color: '#fff', fontSize: '0.68rem', fontWeight: 800,
            letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            {video.type === 'Clip' ? 'Clip' : video.type}
          </span>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{
          position: 'absolute', right: 12, bottom: 160, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          {/* Watch */}
          <SidebarAction
            icon={<VscPlayCircle size={26} />}
            label="Watch"
            onClick={() => router.push(`/media/${item.media_type || 'movie'}/${item.id}`)}
            glow
          />

          {/* Watchlist */}
          <SidebarAction
            icon={inWatchlist ? <MdBookmark size={24} /> : <VscBookmark size={24} />}
            label={inWatchlist ? 'Saved' : 'Save'}
            onClick={e => { e.stopPropagation(); setInWatchlist(v => !v); }}
            active={inWatchlist}
          />

          {/* Share */}
          <SidebarAction
            icon={<VscShare size={22} />}
            label={copied ? 'Copied!' : 'Share'}
            onClick={handleShare}
            active={copied}
          />

          {/* Mute */}
          <SidebarAction
            icon={muted ? <VscMute size={24} /> : <VscUnmute size={24} />}
            label={muted ? 'Muted' : 'Sound'}
            onClick={e => { e.stopPropagation(); onToggleMute(); }}
            active={!muted}
          />
        </div>

        {/* ── Bottom info overlay ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          padding: '80px 16px 20px',
          paddingRight: 80, // make room for sidebar
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px',
              borderRadius: 4, letterSpacing: '0.05em',
            }}>HD</span>
            <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800 }}>
              ★ {rating}
            </span>
            {year && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{year}</span>}
          </div>

          <h2 style={{
            color: '#fff', fontSize: 'clamp(1.1rem, 3.5dvh, 1.5rem)',
            fontWeight: 900, margin: 0, lineHeight: 1.15,
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          }}>{title}</h2>

          {item.overview && (
            <p style={{
              color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem',
              lineHeight: 1.4, marginTop: 8,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.overview}
            </p>
          )}
        </div>

        {/* ── Seekable progress bar ── */}
        <div
          onMouseDown={handleSeek}
          onTouchStart={handleSeek}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 30,
            height: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div style={{
            width: '100%', height: 3,
            background: 'rgba(255,255,255,0.12)',
            position: 'relative',
          }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: 'var(--primary)',
              boxShadow: '0 0 8px var(--primary)',
              transition: 'width 0.2s linear',
              borderRadius: '0 2px 2px 0',
            }} />
            {/* Scrub handle */}
            <div style={{
              position: 'absolute', top: '50%',
              left: `${progress}%`, transform: 'translate(-50%, -50%)',
              width: 12, height: 12, borderRadius: '50%',
              background: '#fff', boxShadow: '0 0 6px rgba(0,0,0,0.6)',
              transition: 'left 0.2s linear',
            }} />
          </div>
        </div>
      </div>

      {/* ── Swipe hint ── */}
      {isActive && !isLast && (
        <motion.div
          animate={{ y: [0, 8, 0], opacity: [0.4, 0.9, 0.4] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
          style={{
            position: 'absolute', bottom: 22,
            left: '50%', transform: 'translateX(-50%)',
            zIndex: 50, color: '#fff', pointerEvents: 'none',
          }}
        >
          <VscChevronDown size={26} />
        </motion.div>
      )}
    </div>
  );
}

// ─── Sidebar Action Button ────────────────────────────────────────────────────
function SidebarAction({
  icon, label, onClick, glow = false, active = false
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  glow?: boolean;
  active?: boolean;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.88 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{
        width: 50, height: 50, borderRadius: '50%',
        background: glow
          ? 'var(--primary)'
          : active
            ? 'rgba(157,0,255,0.25)'
            : 'rgba(255,255,255,0.08)',
        border: `1px solid ${glow ? 'transparent' : active ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
        backdropFilter: glow ? 'none' : 'blur(16px)',
        boxShadow: glow ? '0 6px 20px rgba(157,0,255,0.45)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
        transition: 'all 0.2s ease',
      }}>
        {icon}
      </div>
      <span style={{
        color: '#fff', fontSize: '0.6rem', fontWeight: 700,
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        letterSpacing: '0.04em',
      }}>
        {label}
      </span>
    </motion.div>
  );
}

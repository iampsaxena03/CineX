'use client';

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { VscShare } from 'react-icons/vsc'
import StreamPlayer, { StreamPlayerRef } from './ui/StreamPlayer'
import GlassSurface from './ui/GlassSurface'
import { generateStoryCard } from '@/lib/storyCard'
import WatchlistButton from './WatchlistButton'
import ShareStoryModal from './ShareStoryModal'

interface MediaInteractiveProps {
  id: string
  type: 'movie' | 'tv'
  seasons?: any[]
  title?: string
  posterUrl?: string
}

const PROVIDERS = [
  { id: 'vidfast', name: 'Stream 1', color: '#9d00ff' },
  { id: 'vidlink', name: 'Stream 2', color: '#63b8bc' }
]

export default function MediaInteractive({ id, type, seasons, title = "Unknown Title", posterUrl }: MediaInteractiveProps) {
  const [activeProvider, setActiveProvider] = useState('vidfast')
  const [season, setSeason] = useState(seasons && seasons.length > 0 ? (seasons[0].season_number || 1) : 1)
  const [episode, setEpisode] = useState(1)
  const [isSharing, setIsSharing] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [storyFile, setStoryFile] = useState<File | null>(null)
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null)
  const playerRef = useRef<StreamPlayerRef>(null)

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl)
    }
  }, [storyPreviewUrl])

  // Determine embed url based on provider
  const getEmbedUrl = () => {
    if (activeProvider === 'vidfast') {
      const base = 'https://vidfast.pro'
      return type === 'movie'
        ? `${base}/movie/${id}`
        : `${base}/tv/${id}/${season}/${episode}?autoPlay=true&title=true&poster=true&theme=9B59B6&nextButton=true&autoNext=true`
    } else {
      // Vidlink
      const base = 'https://vidlink.pro'
      const params = 'primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=default&title=true&poster=true&autoplay=true&nextbutton=true'
      return type === 'movie'
        ? `${base}/movie/${id}?${params}`
        : `${base}/tv/${id}/${season}/${episode}?${params}`
    }
  }

  const embedUrl = getEmbedUrl()

  // For finding number of episodes in season
  const selectedSeason = seasons?.find(s => s.season_number === season)
  const epCount = selectedSeason?.episode_count || 0

  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      // Pause player
      playerRef.current?.pause();

      let file: File | null = null;
      if (posterUrl) {
        try {
          file = await generateStoryCard(title, posterUrl, type);
          setStoryFile(file);
          const url = URL.createObjectURL(file);
          setStoryPreviewUrl(url);
          setShowShareModal(true);
        } catch (err) {
          console.error("Story card generation failed:", err);
          // Fallback to simple link share if card fails
          if (navigator.share) {
             await navigator.share({ title, url: window.location.href });
          }
        }
      }
    } catch (e) {
      console.log('Share canceled or failed', e);
    } finally {
      setIsSharing(false);
    }
  };

  const handleModalShare = async () => {
    if (!storyFile) return;
    try {
      const shareData: ShareData = {
        title: `Watch ${title} on CineX`,
        text: `Check out ${title} on CineX Premium!`,
        url: window.location.href,
      };

      if (navigator.canShare && navigator.canShare({ files: [storyFile] })) {
        shareData.files = [storyFile];
      }

      await navigator.share(shareData);
    } catch (e) {
      console.log('Share failed', e);
    }
  };

  const handleModalDownload = () => {
    if (!storyPreviewUrl) return;
    const link = document.createElement('a');
    link.href = storyPreviewUrl;
    link.download = `cinex-${title.toLowerCase().replace(/\s+/g, '-')}-story.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseModal = () => {
    setShowShareModal(false);
    playerRef.current?.play();
  };

  return (
    <div className="media-interactive-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Premium Provider Switcher */}
      <div className="provider-switcher-container" style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', padding: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '4px' }}>
          <GlassSurface 
            width="100%" 
            height="100%" 
            borderRadius={99} 
            borderWidth={0.02} 
            brightness={30} 
            opacity={0.8} 
            blur={20}
            className="absolute inset-0"
            style={{ zIndex: -1 }}
          />
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProvider(p.id)}
              style={{
                position: 'relative',
                padding: '0.6rem 1.5rem',
                borderRadius: '99px',
                border: 'none',
                background: 'transparent',
                color: activeProvider === p.id ? 'white' : 'rgba(255,255,255,0.5)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'color 0.3s ease',
                outline: 'none',
                zIndex: 1
              }}
            >
              {activeProvider === p.id && (
                <motion.div
                  layoutId="active-pill"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: p.color,
                    borderRadius: '99px',
                    zIndex: -1,
                    boxShadow: `0 0 15px ${p.color}44`
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {type === 'tv' && seasons && (
        <div className="tv-controls" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={season} 
              onChange={(e) => {
                setSeason(Number(e.target.value))
                setEpisode(1)
              }}
              className="season-select"
              style={{ 
                padding: '0.75rem 1.5rem', 
                borderRadius: '12px', 
                background: 'rgba(255,255,255,0.05)', 
                color: 'white', 
                border: '1px solid rgba(157, 0, 255, 0.3)',
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              {seasons.map((s) => (
                s.season_number > 0 && <option key={s.id} value={s.season_number} style={{ background: '#1a0b2e' }}>Season {s.season_number}</option>
              ))}
            </select>
          </div>
          
          <div style={{ position: 'relative' }}>
            <select
              value={episode}
              onChange={(e) => setEpisode(Number(e.target.value))}
              className="episode-select"
              style={{ 
                padding: '0.75rem 1.5rem', 
                borderRadius: '12px', 
                background: 'rgba(255,255,255,0.05)', 
                color: 'white', 
                border: '1px solid rgba(157, 0, 255, 0.3)',
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              {Array.from({ length: epCount }).map((_, i) => (
                <option key={i + 1} value={i + 1} style={{ background: '#1a0b2e' }}>Episode {i + 1}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: type === 'tv' && seasons ? '-1rem' : '0' }}>
        <WatchlistButton 
          item={{ id, type, title, poster_path: posterUrl || null, backdrop_path: null }}
        />
        <button
          onClick={handleShare}
          disabled={isSharing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            background: isSharing ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '999px',
            color: isSharing ? 'rgba(255,255,255,0.5)' : 'white',
            cursor: isSharing ? 'wait' : 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          <VscShare /> {isSharing ? 'Generating Story...' : 'Share to Story'}
        </button>
      </div>

      <div className="player-container" style={{ aspectRatio: '16/9', width: '100%', background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 30px rgba(157, 0, 255, 0.1)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeProvider}-${season}-${episode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ width: '100%', height: '100%' }}
          >
            <StreamPlayer ref={playerRef} embedUrl={embedUrl} isPaused={showShareModal} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="download-section" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600, opacity: 0.9 }}>Available Downloads</h3>
        <GlassSurface
          width="100%"
          height="auto"
          borderRadius={16}
          borderWidth={0.05}
          brightness={20}
          opacity={0.6}
          blur={10}
        >
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ opacity: 0.5, fontSize: '0.95rem' }}>Stream is optimized for high-speed playback. <br/>Offline downloads currently being processed for this title.</p>
          </div>
        </GlassSurface>
      </div>

      <ShareStoryModal 
        isOpen={showShareModal}
        onClose={handleCloseModal}
        onShare={handleModalShare}
        onDownload={handleModalDownload}
        previewUrl={storyPreviewUrl}
        title={title}
      />
    </div>
  )
}

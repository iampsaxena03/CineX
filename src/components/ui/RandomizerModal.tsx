'use client'

import { motion, AnimatePresence } from 'motion/react'
import { VscClose, VscRefresh } from 'react-icons/vsc'
import GlassSurface from './GlassSurface'
import { useEffect } from 'react'
import { TMDB_IMAGE_BASE } from '@/lib/tmdb'

interface RandomItem {
  url: string
  title: string
  poster_path: string | null
  media_type: string
  id: number
}

interface RandomizerModalProps {
  isOpen: boolean
  onClose: () => void
  onReroll: () => void
  onConfirm: () => void
  item: RandomItem | null
  isLoading: boolean
}

export default function RandomizerModal({ 
  isOpen, 
  onClose, 
  onReroll, 
  onConfirm, 
  item,
  isLoading 
}: RandomizerModalProps) {

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 10000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(2, 1, 6, 0.9)', 
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)'
            }}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ 
              position: 'relative', 
              width: '100%',
              maxWidth: '400px',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '32px',
              background: 'rgba(25, 15, 45, 0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
              overflow: 'hidden'
            }}
          >
            <GlassSurface
              width="100%"
              height="100%"
              borderRadius={32}
              borderWidth={0}
              brightness={30}
              opacity={0.8}
              blur={40}
              displace={0}
              backgroundOpacity={1}
              saturation={1.5}
              style={{ position: 'absolute', inset: 0, zIndex: -1 }}
            />

            {/* Header */}
            <div style={{ padding: '1.5rem 1.5rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9d00ff', boxShadow: '0 0 12px #9d00ff' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, color: 'white' }}>
                    Surprise Selection
                </span>
              </div>
              <button 
                onClick={onClose}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '12px', 
                  width: '32px', 
                  height: '32px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <VscClose size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem', lineHeight: 1.2 }}>
                CineXP Chose For You!
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
                Dive into this random selection we picked just for you.
              </p>

              {/* Media Card */}
              <div 
                style={{ 
                  position: 'relative', 
                  aspectRatio: '2/3', 
                  borderRadius: '20px', 
                  overflow: 'hidden',
                  margin: '0 auto 1.5rem',
                  maxWidth: '220px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {isLoading ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <div style={{ width: '30px', height: '30px', border: '3px solid rgba(157,0,255,0.2)', borderTop: '3px solid #9d00ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : item?.poster_path ? (
                  <motion.img 
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={`${TMDB_IMAGE_BASE}/w500${item.poster_path}`} 
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)' }}>
                    No Poster
                  </div>
                )}

                {/* Info Overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem 1rem 1rem', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                  <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item?.title}
                  </h3>
                  <div style={{ fontSize: '0.7rem', color: '#9d00ff', textTransform: 'uppercase', fontWeight: 800, marginTop: '2px' }}>
                    {item?.media_type === 'tv' ? 'TV SERIES' : 'MOVIE'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <button
                  disabled={isLoading}
                  onClick={onConfirm}
                  style={{
                    padding: '1rem',
                    background: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    color: '#0a0510',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 0 25px rgba(255,255,255,0.2)',
                    transition: 'transform 0.2s',
                    opacity: isLoading ? 0.5 : 1
                  }}
                >
                  Watch Now
                </button>
                
                <button
                  disabled={isLoading}
                  onClick={onReroll}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: isLoading ? 0.5 : 1
                  }}
                >
                  <VscRefresh size={18} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} /> 
                  Try Something Else
                </button>
              </div>
            </div>

            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

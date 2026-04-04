'use client'

import { motion, AnimatePresence } from 'motion/react'
import { VscClose, VscCloudDownload, VscShare } from 'react-icons/vsc'
import GlassSurface from './ui/GlassSurface'
import { useEffect } from 'react'

interface ShareStoryModalProps {
  isOpen: boolean
  onClose: () => void
  onShare: () => void
  onDownload: () => void
  previewUrl: string | null
  title: string
}

export default function ShareStoryModal({ 
  isOpen, 
  onClose, 
  onShare, 
  onDownload, 
  previewUrl,
  title 
}: ShareStoryModalProps) {

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
            padding: '1rem'
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
              background: 'rgba(4, 1, 10, 0.85)', 
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          />

          {/* Modal Content */}
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            style={{ 
              position: 'relative', 
              height: '85vh', // High priority on height
              maxHeight: '750px',
              width: 'auto',
              aspectRatio: '9/16.5', // Account for title and buttons
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              padding: '1.2rem',
              borderRadius: '28px',
              background: 'rgba(15, 10, 25, 0.8)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.9 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}></span>
                Preview Card
              </h2>
              <button 
                onClick={onClose}
                style={{ 
                  background: 'rgba(255,255,255,0.06)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '10px', 
                  width: '28px', 
                  height: '28px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
              >
                <VscClose size={16} />
              </button>
            </div>

            {/* Preview Card - Strictly bounded */}
            <div 
              style={{ 
                flex: 1,
                minHeight: 0,
                width: '100%',
                display: 'flex',
                alignItems: 'center', 
                justifyContent: 'center',
                borderRadius: '16px', 
                overflow: 'hidden', 
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.05)',
                position: 'relative'
              }}
            >
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Story Preview" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%', 
                    objectFit: 'contain',
                    aspectRatio: '9/16'
                  }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div style={{ width: '24px', height: '24px', border: '2px solid rgba(157,0,255,0.2)', borderTop: '2px solid #9d00ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flexShrink: 0, marginTop: '0.2rem' }}>
              <button
                onClick={onShare}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px var(--primary-glow)',
                  transition: 'all 0.2s'
                }}
              >
                <VscShare size={16} /> Share to Story
              </button>
              
              <button
                onClick={onDownload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <VscCloudDownload size={16} /> Download PNG
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.3, letterSpacing: '0.02em', flexShrink: 0 }}>
              {title} • CineX Premium
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

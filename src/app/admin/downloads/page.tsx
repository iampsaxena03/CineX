'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import AdminSearch from '@/components/admin/AdminSearch'
import { getImageUrl } from '@/lib/tmdb'

interface MediaItem {
  id: string
  tmdbId: number
  type: string
  _count: { downloadLinks: number }
  // Enriched data from TMDB
  title?: string
  posterUrl?: string
}

export default function DownloadsPage() {
  const router = useRouter()
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMedia = async () => {
      try {
        const res = await fetch('/api/admin/downloads/media')
        const data = await res.json()
        const items: MediaItem[] = data.mediaPosts || []

        // Enrich each item with TMDB name + poster
        const enriched = await Promise.all(
          items.map(async (item) => {
            try {
              const tmdbRes = await fetch(`/api/tmdb/${item.type}/${item.tmdbId}?api_key=`)
              const tmdbData = await tmdbRes.json()
              return {
                ...item,
                title: tmdbData.title || tmdbData.name || `Unknown (#${item.tmdbId})`,
                posterUrl: tmdbData.poster_path ? getImageUrl(tmdbData.poster_path, 'w92') : undefined,
              }
            } catch {
              return { ...item, title: `Unknown (#${item.tmdbId})` }
            }
          })
        )

        setRecentMedia(enriched)
      } catch {
        // fail silently
      } finally {
        setLoading(false)
      }
    }

    loadMedia()
  }, [])

  const handleSelect = (item: any) => {
    const type = item.media_type === 'tv' ? 'tv' : 'movie'
    router.push(`/admin/downloads/edit?tmdbId=${item.id}&type=${type}`)
  }

  return (
    <>
      <div className="admin-page-header">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Download Links Manager
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Search for any movie or TV show to manage its download links
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        style={{ marginBottom: '2.5rem' }}
      >
        <AdminSearch
          onSelect={handleSelect}
          placeholder="Search for a movie or TV show to add download links..."
          autoFocus
        />
      </motion.div>

      {/* Recently Edited */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Recently Configured
        </h2>
        <div className="admin-section-card">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading...</div>
          ) : recentMedia.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state-icon">🔗</div>
              <p>No download links configured yet.<br />Search above to get started.</p>
            </div>
          ) : (
            <div className="admin-media-configured-grid">
              {recentMedia.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/admin/downloads/edit?tmdbId=${item.tmdbId}&type=${item.type}`)}
                  className="admin-quick-action"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                  }}
                >
                  {/* Poster thumbnail */}
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.title || ''}
                      style={{
                        width: 40,
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 8,
                        flexShrink: 0,
                        background: 'rgba(255,255,255,0.05)',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 40,
                      height: 60,
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      opacity: 0.4,
                      flexShrink: 0,
                    }}>
                      N/A
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 600 }}>{item.title}</h3>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '3px' }}>
                      <span className={`admin-badge admin-badge-${item.type}`}>{item.type.toUpperCase()}</span>
                      {' · '}{item._count.downloadLinks} links
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

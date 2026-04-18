'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { generateSlug } from "@/lib/utils"
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { VscAdd, VscTrash, VscArrowLeft, VscSave, VscGlobe } from 'react-icons/vsc'
import { getImageUrl } from '@/lib/tmdb'
import { useToast } from '@/components/admin/Toast'
import Link from 'next/link'

interface DownloadLink {
  id?: string
  quality: string
  label: string
  size: string
  url: string
}

interface EpisodeData {
  episodeNumber: number
  downloadLinks: DownloadLink[]
}

interface SeasonData {
  seasonNumber: number
  episodes: EpisodeData[]
}

const QUALITY_OPTIONS = ['480p', '720p', '1080p', '2160p (4K)']

function emptyLink(): DownloadLink {
  return { quality: '1080p', label: '', size: '', url: '' }
}

export default function DownloadEditPage() {
  const searchParams = useSearchParams()
  const tmdbId = searchParams.get('tmdbId')
  const type = searchParams.get('type') as 'movie' | 'tv'
  const { showToast } = useToast()

  const [mediaInfo, setMediaInfo] = useState<any>(null)
  const [movieLinks, setMovieLinks] = useState<DownloadLink[]>([])
  const [seasonData, setSeasonData] = useState<Map<number, Map<number, DownloadLink[]>>>(new Map())
  const [activeTab, setActiveTab] = useState<'movie' | 'episodes'>('movie')
  const [activeSeason, setActiveSeason] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch TMDB info + existing download data
  useEffect(() => {
    if (!tmdbId || !type) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch TMDB details
        const tmdbRes = await fetch(`/api/tmdb/${type}/${tmdbId}?api_key=`)
        const tmdbData = await tmdbRes.json()
        setMediaInfo(tmdbData)

        // Set initial active season for TV
        if (type === 'tv' && tmdbData.seasons) {
          const firstReal = tmdbData.seasons.find((s: any) => s.season_number > 0)
          if (firstReal) setActiveSeason(firstReal.season_number)
        }

        // Fetch existing download links
        const dlRes = await fetch(`/api/admin/downloads?tmdbId=${tmdbId}&type=${type}`)
        const dlData = await dlRes.json()

        if (dlData.mediaPost) {
          // Load movie-level links
          const directLinks = dlData.mediaPost.downloadLinks || []
          setMovieLinks(directLinks.length > 0 ? directLinks : [emptyLink()])

          // Load episode-level links
          if (dlData.mediaPost.seasons) {
            const sMap = new Map<number, Map<number, DownloadLink[]>>()
            for (const season of dlData.mediaPost.seasons) {
              const epMap = new Map<number, DownloadLink[]>()
              for (const ep of season.episodes) {
                if (ep.downloadLinks && ep.downloadLinks.length > 0) {
                  epMap.set(ep.episodeNumber, ep.downloadLinks)
                }
              }
              if (epMap.size > 0) sMap.set(season.seasonNumber, epMap)
            }
            setSeasonData(sMap)
          }
        } else {
          setMovieLinks([emptyLink()])
        }
      } catch (err) {
        console.error(err)
        showToast('Failed to load data', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [tmdbId, type])

  const title = mediaInfo?.title || mediaInfo?.name || 'Loading...'
  const year = (mediaInfo?.release_date || mediaInfo?.first_air_date || '').split('-')[0]
  const posterUrl = getImageUrl(mediaInfo?.poster_path, 'w342')
  const seasons = mediaInfo?.seasons?.filter((s: any) => s.season_number > 0) || []

  // Movie link handlers
  const updateMovieLink = (index: number, field: keyof DownloadLink, value: string) => {
    setMovieLinks(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addMovieLink = () => setMovieLinks(prev => [...prev, emptyLink()])

  const removeMovieLink = (index: number) => {
    setMovieLinks(prev => prev.filter((_, i) => i !== index))
  }

  // Episode link handlers
  const getEpisodeLinks = (seasonNum: number, epNum: number): DownloadLink[] => {
    return seasonData.get(seasonNum)?.get(epNum) || []
  }

  const setEpisodeLinks = (seasonNum: number, epNum: number, links: DownloadLink[]) => {
    setSeasonData(prev => {
      const newMap = new Map(prev)
      if (!newMap.has(seasonNum)) newMap.set(seasonNum, new Map())
      newMap.get(seasonNum)!.set(epNum, links)
      return newMap
    })
  }

  const addEpisodeLink = (seasonNum: number, epNum: number) => {
    const current = getEpisodeLinks(seasonNum, epNum)
    setEpisodeLinks(seasonNum, epNum, [...current, emptyLink()])
  }

  const updateEpisodeLink = (seasonNum: number, epNum: number, linkIndex: number, field: keyof DownloadLink, value: string) => {
    const current = [...getEpisodeLinks(seasonNum, epNum)]
    current[linkIndex] = { ...current[linkIndex], [field]: value }
    setEpisodeLinks(seasonNum, epNum, current)
  }

  const removeEpisodeLink = (seasonNum: number, epNum: number, linkIndex: number) => {
    const current = getEpisodeLinks(seasonNum, epNum)
    setEpisodeLinks(seasonNum, epNum, current.filter((_, i) => i !== linkIndex))
  }

  // Save
  const handleSave = async () => {
    setSaving(true)
    try {
      const validLinks = movieLinks.filter(l => l.url.trim())

      const episodeLinksPayload: Record<string, Record<string, DownloadLink[]>> = {}
      seasonData.forEach((epMap, seasonNum) => {
        episodeLinksPayload[seasonNum] = {}
        epMap.forEach((links, epNum) => {
          const validEpLinks = links.filter(l => l.url.trim())
          if (validEpLinks.length > 0) {
            episodeLinksPayload[seasonNum][epNum] = validEpLinks
          }
        })
      })

      const res = await fetch('/api/admin/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId,
          type,
          links: type === 'movie' || activeTab === 'movie' ? validLinks : undefined,
          episodeLinks: type === 'tv' ? episodeLinksPayload : undefined,
        }),
      })

      if (res.ok) {
        showToast('Download links saved successfully!', 'success')
      } else {
        showToast('Failed to save links', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Get episode count for active season from TMDB
  const activeSeasonData = seasons.find((s: any) => s.season_number === activeSeason)
  const episodeCount = activeSeasonData?.episode_count || 0

  if (!tmdbId || !type) {
    return (
      <div className="admin-empty-state">
        <p>No media selected. <Link href="/admin/downloads">Go back to search</Link></p>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Link href="/admin/downloads" className="admin-btn-icon">
          <VscArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Edit Download Links</h1>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>Loading media information...</div>
      ) : (
        <>
          {/* Media Info Card */}
          <motion.div
            className="admin-section-card admin-media-info-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {mediaInfo?.poster_path && (
              <img
                src={posterUrl}
                alt={title}
                style={{ width: 100, borderRadius: 10, flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.3rem' }}>{title}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
                {year && <span style={{ opacity: 0.5 }}>{year}</span>}
                <span className={`admin-badge admin-badge-${type}`}>{type.toUpperCase()}</span>
                {mediaInfo?.vote_average > 0 && (
                  <span style={{ fontSize: '0.85rem' }}>⭐ {mediaInfo.vote_average.toFixed(1)}</span>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', opacity: 0.5, lineHeight: 1.6, maxWidth: 600 }}>
                {mediaInfo?.overview?.substring(0, 200)}{mediaInfo?.overview?.length > 200 ? '...' : ''}
              </p>
            </div>
              <div className="admin-media-info-actions" style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <a href={`/media/${type}/${generateSlug(tmdbId, title)}`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary admin-btn-sm">
                <VscGlobe size={14} /> Preview
              </a>
            </div>
          </motion.div>

          {/* Tab Switcher for TV */}
          {type === 'tv' && (
            <div className="admin-tabs" style={{ maxWidth: 320, marginBottom: '1.5rem' }}>
              <button
                className={`admin-tab ${activeTab === 'movie' ? 'active' : ''}`}
                onClick={() => setActiveTab('movie')}
              >
                Full Season
              </button>
              <button
                className={`admin-tab ${activeTab === 'episodes' ? 'active' : ''}`}
                onClick={() => setActiveTab('episodes')}
              >
                Per Episode
              </button>
            </div>
          )}

          {/* Download Links Editor */}
          {(type === 'movie' || activeTab === 'movie') && (
            <motion.div
              className="admin-section-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ marginBottom: 0 }}>
                  {type === 'movie' ? 'Movie Downloads' : 'Full Season Downloads'}
                </h2>
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={addMovieLink}>
                  <VscAdd size={14} /> Add Link
                </button>
              </div>

              <AnimatePresence>
                {movieLinks.map((link, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="admin-link-row"
                  >
                    <select
                      className="admin-select"
                      value={link.quality}
                      onChange={(e) => updateMovieLink(index, 'quality', e.target.value)}
                      style={{ padding: '0.6rem 0.75rem' }}
                    >
                      {QUALITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <input
                      className="admin-input"
                      placeholder="Label (e.g. 1080p Web-DL)"
                      value={link.label}
                      onChange={(e) => updateMovieLink(index, 'label', e.target.value)}
                      style={{ padding: '0.6rem 0.75rem' }}
                    />
                    <input
                      className="admin-input"
                      placeholder="Size"
                      value={link.size}
                      onChange={(e) => updateMovieLink(index, 'size', e.target.value)}
                      style={{ padding: '0.6rem 0.75rem' }}
                    />
                    <input
                      className="admin-input"
                      placeholder="Download URL"
                      value={link.url}
                      onChange={(e) => updateMovieLink(index, 'url', e.target.value)}
                      style={{ padding: '0.6rem 0.75rem' }}
                    />
                    <button
                      className="admin-btn-icon"
                      onClick={() => removeMovieLink(index)}
                      style={{ color: 'var(--admin-danger)' }}
                    >
                      <VscTrash size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Episode-level editor */}
          {type === 'tv' && activeTab === 'episodes' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Season tabs */}
              {seasons.length > 0 && (
                <div className="admin-season-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                  {seasons.map((s: any) => (
                    <button
                      key={s.season_number}
                      className={`admin-btn ${activeSeason === s.season_number ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                      onClick={() => setActiveSeason(s.season_number)}
                    >
                      S{s.season_number}
                      <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>({s.episode_count} ep)</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Episodes */}
              {Array.from({ length: episodeCount }).map((_, i) => {
                const epNum = i + 1
                const epLinks = getEpisodeLinks(activeSeason, epNum)

                return (
                  <div key={epNum} className="admin-section-card" style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: epLinks.length > 0 ? '0.75rem' : 0 }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        Episode {epNum}
                      </h3>
                      <button
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => addEpisodeLink(activeSeason, epNum)}
                        style={{ fontSize: '0.72rem' }}
                      >
                        <VscAdd size={12} /> Add
                      </button>
                    </div>

                    {epLinks.map((link, linkIndex) => (
                      <div
                        key={linkIndex}
                        className="admin-ep-link-row"
                      >
                        <select
                          className="admin-select"
                          value={link.quality}
                          onChange={(e) => updateEpisodeLink(activeSeason, epNum, linkIndex, 'quality', e.target.value)}
                          style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        >
                          {QUALITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                        <input
                          className="admin-input"
                          placeholder="Label"
                          value={link.label}
                          onChange={(e) => updateEpisodeLink(activeSeason, epNum, linkIndex, 'label', e.target.value)}
                          style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        />
                        <input
                          className="admin-input"
                          placeholder="Size"
                          value={link.size}
                          onChange={(e) => updateEpisodeLink(activeSeason, epNum, linkIndex, 'size', e.target.value)}
                          style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        />
                        <input
                          className="admin-input"
                          placeholder="URL"
                          value={link.url}
                          onChange={(e) => updateEpisodeLink(activeSeason, epNum, linkIndex, 'url', e.target.value)}
                          style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                        />
                        <button
                          className="admin-btn-icon"
                          onClick={() => removeEpisodeLink(activeSeason, epNum, linkIndex)}
                          style={{ color: 'var(--admin-danger)', padding: '0.35rem' }}
                        >
                          <VscTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* Save Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-save-bar"
          >
            <Link href="/admin/downloads" className="admin-btn admin-btn-secondary">
              Cancel
            </Link>
            <button
              className="admin-btn admin-btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              <VscSave size={14} />
              {saving ? 'Saving...' : 'Save All Links'}
            </button>
          </motion.div>
        </>
      )}
    </>
  )
}

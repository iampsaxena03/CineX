'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { VscSearch, VscHome, VscFlame, VscPlayCircle, VscListSelection, VscArrowRight, VscLoading } from 'react-icons/vsc'

interface SearchResult {
  id: number
  media_type: string
  title?: string
  name?: string
  poster_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
}

const STATIC_ACTIONS = [
  { id: 'home', title: 'Go to Home', icon: <VscHome />, href: '/' },
  { id: 'trending', title: 'Trending Now', icon: <VscFlame />, href: '/trending' },
  { id: 'movies', title: 'Movies', icon: <VscPlayCircle />, href: '/movies' },
  { id: 'series', title: 'TV Series', icon: <VscListSelection />, href: '/tv' },
]

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Build the flat actions list: nav items first, then search results, then "Search for" at the end
  const getActions = useCallback(() => {
    const trimmed = query.trim()

    if (!trimmed) return STATIC_ACTIONS.map(a => ({ ...a, type: 'nav' as const }))

    const filtered = STATIC_ACTIONS
      .filter(a => a.title.toLowerCase().includes(trimmed.toLowerCase()))
      .map(a => ({ ...a, type: 'nav' as const }))

    const apiResults = searchResults.map(r => ({
      id: `result-${r.media_type}-${r.id}`,
      title: r.title || r.name || 'Unknown',
      icon: null as React.ReactNode,
      href: `/${r.media_type}/${r.id}`,
      type: 'result' as const,
      poster: r.poster_path,
      year: (r.release_date || r.first_air_date || '').slice(0, 4),
      mediaType: r.media_type,
      rating: r.vote_average,
    }))

    const searchAction = {
      id: 'search-full',
      title: `Search for "${trimmed}"`,
      icon: <VscSearch /> as React.ReactNode,
      href: `/search?q=${encodeURIComponent(trimmed)}`,
      type: 'nav' as const,
    }

    return [...filtered, ...apiResults, searchAction]
  }, [query, searchResults])

  const actionsRef = useRef(getActions())
  actionsRef.current = getActions()

  const selectedIndexRef = useRef(selectedIndex)
  selectedIndexRef.current = selectedIndex

  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  // Fetch search results with debounce
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    if (abortRef.current) abortRef.current.abort()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        if (!controller.signal.aborted) {
          setSearchResults((data.results || []).slice(0, 5))
          setIsSearching(false)
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setIsSearching(false)
        }
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Reset selection when query or results change
  useEffect(() => { setSelectedIndex(0) }, [query, searchResults])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isOpen])

  // Single consolidated keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => {
          if (!prev) {
            setQuery('')
            setSelectedIndex(0)
            setSearchResults([])
          }
          return !prev
        })
        return
      }

      if (!isOpenRef.current) return

      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const len = actionsRef.current.length
        setSelectedIndex(prev => (prev + 1) % len)
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const len = actionsRef.current.length
        setSelectedIndex(prev => (prev - 1 < 0 ? len - 1 : prev - 1))
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        const selected = actionsRef.current[selectedIndexRef.current]
        if (selected) {
          router.push(selected.href)
          setIsOpen(false)
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  const actions = actionsRef.current

  // Split into nav items and result items for sectioned rendering
  const navItems = actions.filter((a: any) => a.type === 'nav')
  const resultItems = actions.filter((a: any) => a.type === 'result')

  // Compute the flat index offset for result items
  const navCount = navItems.length
  // For "Search for" action — it's the last nav item when query exists
  const hasQuery = query.trim().length > 0

  // Separate the "Search for" action if it exists
  const quickActions = hasQuery ? navItems.slice(0, -1) : navItems
  const searchForAction = hasQuery ? navItems[navItems.length - 1] : null

  // Build a flat index map: quickActions → resultItems → searchForAction
  const orderedActions = [...quickActions, ...resultItems, ...(searchForAction ? [searchForAction] : [])]

  // Update the ref with reordered actions
  actionsRef.current = orderedActions

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
            />

            {/* Modal — no GlassSurface, direct glass styling to avoid flex centering issues */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              style={{
                width: '100%',
                maxWidth: '580px',
                margin: '0 1rem',
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                background: 'rgba(12, 6, 28, 0.92)',
                border: '1px solid rgba(157, 0, 255, 0.18)',
                backdropFilter: 'blur(40px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
              }}
            >
              {/* ─── Search Input ─── */}
              <div style={{
                padding: '0.9rem 1.1rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                {isSearching ? (
                  <VscLoading size={20} style={{ color: 'var(--primary)', flexShrink: 0, animation: 'command-spin 1s linear infinite' }} />
                ) : (
                  <VscSearch size={20} style={{ color: 'var(--primary)', opacity: 0.8, flexShrink: 0 }} />
                )}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search movies, TV series, or jump to..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'white',
                    fontSize: '1.1rem',
                    padding: '0.35rem 0',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.08)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  opacity: 0.5,
                  color: 'white',
                  flexShrink: 0,
                }}>ESC</div>
              </div>

              {/* ─── Quick Navigation ─── */}
              {quickActions.length > 0 && (
                <div style={{ padding: '0.4rem 0.5rem' }}>
                  {hasQuery && (
                    <div style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.3, color: 'white' }}>
                      Navigation
                    </div>
                  )}
                  {quickActions.map((action: any, i: number) => {
                    const flatIndex = i
                    const isSelected = flatIndex === selectedIndex
                    return (
                      <div
                        key={action.id}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        onClick={() => { router.push(action.href); setIsOpen(false) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(157, 0, 255, 0.14)' : 'transparent',
                          color: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.65)',
                          transition: 'background 0.12s, color 0.12s',
                          borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>{action.icon}</span>
                        <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: isSelected ? 600 : 400 }}>{action.title}</span>
                        {isSelected && <VscArrowRight style={{ flexShrink: 0, opacity: 0.6 }} />}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ─── Search Results ─── */}
              {resultItems.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.4rem 0.5rem' }}>
                  <div style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.3, color: 'white' }}>
                    Results
                  </div>
                  {resultItems.map((action: any, i: number) => {
                    const flatIndex = quickActions.length + i
                    const isSelected = flatIndex === selectedIndex
                    return (
                      <div
                        key={action.id}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        onClick={() => { router.push(action.href); setIsOpen(false) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(157, 0, 255, 0.14)' : 'transparent',
                          color: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.65)',
                          transition: 'background 0.12s, color 0.12s',
                          borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                        }}
                      >
                        {/* Poster thumbnail */}
                        {action.poster ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${action.poster}`}
                            alt=""
                            style={{ width: 34, height: 50, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{
                            width: 34, height: 50, borderRadius: 6,
                            background: 'rgba(255,255,255,0.06)', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <VscPlayCircle size={16} style={{ opacity: 0.3 }} />
                          </div>
                        )}

                        {/* Title and metadata */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: isSelected ? 600 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {action.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', opacity: 0.45, marginTop: 2, display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {action.year && <span>{action.year}</span>}
                            <span>•</span>
                            <span>{action.mediaType === 'tv' ? 'TV Series' : 'Movie'}</span>
                            {action.rating > 0 && (
                              <>
                                <span>•</span>
                                <span>★ {action.rating?.toFixed(1)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {isSelected && <VscArrowRight style={{ flexShrink: 0, opacity: 0.6 }} />}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Loading indicator when searching */}
              {isSearching && query.trim() && resultItems.length === 0 && (
                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  padding: '1rem',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  opacity: 0.4,
                  color: 'white',
                }}>
                  Searching...
                </div>
              )}

              {/* ─── "Search for" action at the very bottom ─── */}
              {searchForAction && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.4rem 0.5rem' }}>
                  {(() => {
                    const flatIndex = quickActions.length + resultItems.length
                    const isSelected = flatIndex === selectedIndex
                    return (
                      <div
                        key={searchForAction.id}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        onClick={() => { router.push(searchForAction.href); setIsOpen(false) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(157, 0, 255, 0.14)' : 'transparent',
                          color: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.65)',
                          transition: 'background 0.12s, color 0.12s',
                          borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>{searchForAction.icon}</span>
                        <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: isSelected ? 600 : 400 }}>{searchForAction.title}</span>
                        {isSelected && <VscArrowRight style={{ flexShrink: 0, opacity: 0.6 }} />}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* ─── Footer hints ─── */}
              <div style={{
                padding: '0.45rem 1rem',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                fontSize: '0.65rem',
                opacity: 0.25,
                color: 'white',
              }}>
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Spinner keyframe */}
      {isOpen && (
        <style>{`
          @keyframes command-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      )}
    </>
  )
}

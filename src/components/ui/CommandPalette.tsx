'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { VscSearch, VscHome, VscFlame, VscPlayCircle, VscListSelection, VscArrowRight } from 'react-icons/vsc'
import GlassSurface from './GlassSurface'

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
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter actions based on query
  const filteredActions = query 
    ? STATIC_ACTIONS.filter(a => a.title.toLowerCase().includes(query.toLowerCase()))
    : STATIC_ACTIONS

  // Add the "Search" action at the end if query exists
  const actions = [...filteredActions]
  if (query.trim().length > 0) {
    actions.push({ id: 'search', title: `Search for "${query}"`, icon: <VscSearch />, href: `/search?q=${encodeURIComponent(query)}` })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((open) => {
          if (!open) {
             setQuery('')
             setSelectedIndex(0)
          }
          return !open
        })
      }
      
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Handle keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return

    const handleKeyNav = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % actions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 < 0 ? actions.length - 1 : prev - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = actions[selectedIndex]
        if (selected) {
          router.push(selected.href)
          setIsOpen(false)
        }
      }
    }

    if (isOpen && inputRef.current) inputRef.current.focus()

    window.addEventListener('keydown', handleKeyNav)
    return () => window.removeEventListener('keydown', handleKeyNav)
  }, [isOpen, actions, selectedIndex, router])

  // Reset selection when query changes
  useEffect(() => setSelectedIndex(0), [query])

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ width: '100%', maxWidth: '600px', margin: '0 1rem', position: 'relative', borderRadius: '16px', overflow: 'hidden' }}
          >
            <GlassSurface 
              width="100%" height="auto" borderRadius={16} borderWidth={0.1} brightness={20} opacity={0.9} blur={40}
            >
              <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <VscSearch size={22} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                <input 
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search movies, TV series, or jump to..."
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: '1.2rem', padding: '0.5rem 0' }}
                />
                <div style={{ fontSize: '0.75rem', fontWeight: 600, background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', opacity: 0.7 }}>ESC</div>
              </div>

              <div style={{ padding: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                {actions.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>No results found</div>
                ) : (
                  actions.map((action, index) => {
                    const isSelected = index === selectedIndex
                    return (
                      <div 
                        key={action.id}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => { router.push(action.href); setIsOpen(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem',
                          borderRadius: '8px', cursor: 'pointer',
                          background: isSelected ? 'rgba(157, 0, 255, 0.15)' : 'transparent',
                          color: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.7)',
                          transition: 'all 0.2s',
                          borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{action.icon}</span>
                        <span style={{ flex: 1, fontSize: '1rem', fontWeight: isSelected ? 600 : 400 }}>{action.title}</span>
                        {isSelected && <VscArrowRight />}
                      </div>
                    )
                  })
                )}
              </div>
            </GlassSurface>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

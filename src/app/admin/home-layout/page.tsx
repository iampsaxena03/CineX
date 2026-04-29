'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, Reorder } from 'motion/react'
import { VscAdd, VscTrash, VscGripper, VscArrowRight, VscArrowLeft } from 'react-icons/vsc'
import AdminSearch from '@/components/admin/AdminSearch'
import { useToast } from '@/components/admin/Toast'
import { getImageUrl } from '@/lib/tmdb'

interface SectionItem {
  id: string
  tmdbId: number
  mediaType: string
  position: number
  posterUrl?: string
  title?: string
  preferredStream?: string | null
}

interface Section {
  id: string
  key: string
  title: string
  type: string
  order: number
  visible: boolean
  maxItems: number
  autoFill: boolean
  items: SectionItem[]
  _count: { items: number }
}

const PROVIDERS = [
  { id: 'vidlink', name: 'Stream 1' },
  { id: 'hdvb', name: 'Stream 2' },
  { id: 'vidfast', name: 'Stream 3' },
  { id: 'vidsrc', name: 'Stream 4' },
]

const SECTION_TYPES = [
  { value: 'top10', label: 'Top 10', icon: '🏆' },
  { value: 'trending', label: 'Trending', icon: '🔥' },
  { value: 'latest', label: 'Latest Releases', icon: '✨' },
  { value: 'continue_watching', label: 'Continue Watching', icon: '▶️' },
  { value: 'countdown', label: 'Coming Soon', icon: '⏳' },
  { value: 'custom', label: 'Custom Section', icon: '🎬' },
]

// Core sections that cannot be deleted (can be hidden/reordered)
const CORE_KEYS = ['continue_watching', 'top_10', 'trending', 'recommended']
// Sections where admin can't add content (auto/client-driven)
const NON_EDITABLE_TYPES = ['continue_watching', 'recommended']

export default function HomeLayoutPage() {
  const { showToast } = useToast()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [sectionItems, setSectionItems] = useState<SectionItem[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('custom')
  const [saving, setSaving] = useState(false)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [dragItem, setDragItem] = useState<number | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)

  // Ref to always have fresh sections for debounced/blurred saves
  const sectionsRef = useRef<Section[]>(sections)
  useEffect(() => { sectionsRef.current = sections }, [sections])
  const maxItemsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch sections (auto-seed/fix defaults on every load)
  const fetchSections = useCallback(async () => {
    try {
      // Always call seed — it's idempotent: creates missing, fixes wrong maxItems
      await fetch('/api/admin/home/seed', { method: 'POST' })

      const res = await fetch('/api/admin/home/sections')
      const data = await res.json()
      setSections(data.sections || [])
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSections() }, [fetchSections])

  // Fetch items for active section
  const fetchItems = useCallback(async (sectionId: string) => {
    setItemsLoading(true)
    try {
      const res = await fetch(`/api/admin/home/sections/${sectionId}/items`)
      const data = await res.json()

      // Enrich items with TMDB data
      const enriched = await Promise.all(
        (data.items || []).map(async (item: SectionItem) => {
          try {
            const type = item.mediaType === 'tv' ? 'tv' : 'movie'
            const tmdbRes = await fetch(`/api/tmdb/${type}/${item.tmdbId}?api_key=`)
            const tmdbData = await tmdbRes.json()
            return {
              ...item,
              posterUrl: getImageUrl(tmdbData.poster_path, 'w185'),
              title: tmdbData.title || tmdbData.name || `ID: ${item.tmdbId}`,
            }
          } catch {
            return { ...item, title: `ID: ${item.tmdbId}` }
          }
        })
      )

      setSectionItems(enriched)
    } catch {
      setSectionItems([])
    } finally {
      setItemsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection) fetchItems(activeSection)
    else setSectionItems([])
  }, [activeSection, fetchItems])

  // Create new section
  const createSection = async () => {
    if (!newTitle.trim()) return
    const key = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

    try {
      const res = await fetch('/api/admin/home/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, type: newType, key }),
      })

      if (res.ok) {
        showToast('Section created!', 'success')
        setShowNewModal(false)
        setNewTitle('')
        fetchSections()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to create section', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    }
  }

  // Delete section (block core sections)
  const deleteSection = async (id: string) => {
    const section = sections.find(s => s.id === id)
    if (section && CORE_KEYS.includes(section.key)) {
      showToast('Core sections cannot be deleted. You can hide them instead.', 'info')
      return
    }
    if (!confirm('Delete this section? All items will be removed.')) return

    try {
      await fetch(`/api/admin/home/sections?id=${id}`, { method: 'DELETE' })
      showToast('Section deleted', 'info')
      if (activeSection === id) setActiveSection(null)
      fetchSections()
    } catch {
      showToast('Failed to delete', 'error')
    }
  }

  // Toggle visibility
  const toggleVisibility = async (section: Section) => {
    const updated = sections.map(s =>
      s.id === section.id ? { ...s, visible: !s.visible } : s
    )
    setSections(updated)
    await saveSections(updated)
  }

  // Save section order & settings
  const saveSections = async (secs: Section[]) => {
    try {
      await fetch('/api/admin/home/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: secs.map((s, i) => ({
            id: s.id,
            title: s.title,
            visible: s.visible,
            autoFill: s.autoFill,
            maxItems: s.maxItems,
          }))
        }),
      })
    } catch {
      showToast('Failed to save order', 'error')
    }
  }

  // Reorder handler
  const handleReorder = (newOrder: Section[]) => {
    setSections(newOrder)
  }

  // Save reorder on drag end
  const handleDragEnd = () => {
    saveSections(sections)
    showToast('Order saved', 'success')
  }

  // Add item to section from search
  const handleAddItem = async (item: any) => {
    if (!activeSection) return

    try {
      const res = await fetch(`/api/admin/home/sections/${activeSection}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: item.id,
          mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
        }),
      })

      if (res.ok) {
        showToast(`Added "${item.title || item.name}"`, 'success')
        fetchItems(activeSection)
        // Update item count locally without refetching all sections
        setSections(prev => prev.map(s =>
          s.id === activeSection ? { ...s, _count: { items: s._count.items + 1 } } : s
        ))
      } else {
        showToast('Failed to add item', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    }
  }

  // Remove item from section
  const handleRemoveItem = async (itemId: string) => {
    if (!activeSection) return

    try {
      await fetch(`/api/admin/home/sections/${activeSection}/items?itemId=${itemId}`, {
        method: 'DELETE'
      })
      showToast('Item removed', 'info')
      fetchItems(activeSection)
      // Update item count locally
      setSections(prev => prev.map(s =>
        s.id === activeSection ? { ...s, _count: { items: Math.max(0, s._count.items - 1) } } : s
      ))
    } catch {
      showToast('Failed to remove', 'error')
    }
  }

  // Move item from one slot to another (reorder)
  const handleMoveItem = async (fromSlot: number, toSlot: number) => {
    if (!activeSection) return

    // Build new order by rearranging items
    const newItems = [...sectionItems].sort((a, b) => a.position - b.position)
    const fromIdx = newItems.findIndex(si => si.position === fromSlot)
    if (fromIdx === -1) return

    const [moved] = newItems.splice(fromIdx, 1)
    // Find insertion index based on toSlot
    let toIdx = newItems.findIndex(si => si.position >= toSlot)
    if (toIdx === -1) toIdx = newItems.length
    newItems.splice(toIdx, 0, moved)

    // Update positions
    const reordered = newItems.map((item, idx) => ({
      ...item,
      position: idx,
    }))
    setSectionItems(reordered)

    // Save to API
    try {
      await fetch(`/api/admin/home/sections/${activeSection}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reordered.map(item => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
          }))
        }),
      })
      showToast('Reordered!', 'success')
      fetchItems(activeSection)
    } catch {
      showToast('Reorder failed', 'error')
    }
  }

  // Update item preferred stream
  const handleUpdateStream = async (itemId: string, stream: string) => {
    if (!activeSection) return
    try {
      const res = await fetch(`/api/admin/home/sections/${activeSection}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, preferredStream: stream || null }),
      })
      if (res.ok) {
        showToast('Stream updated', 'success')
        // Optimistically update local state
        setSectionItems(prev => prev.map(item => item.id === itemId ? { ...item, preferredStream: stream || null } : item))
      } else {
        showToast('Failed to update stream', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    }
  }

  // Drop from search result into a specific slot
  const handleDropFromSearch = async (item: any, position: number) => {
    if (!activeSection) return
    try {
      const res = await fetch(`/api/admin/home/sections/${activeSection}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: item.id || item.tmdbId,
          mediaType: item.media_type || item.mediaType || 'movie',
          position,
        }),
      })
      if (res.ok) {
        showToast(`Added to slot ${position + 1}`, 'success')
        fetchItems(activeSection)
        setSections(prev => prev.map(s =>
          s.id === activeSection ? { ...s, _count: { items: s._count.items + 1 } } : s
        ))
      }
    } catch {
      showToast('Drop failed', 'error')
    }
  }

  // Expand placeholder slots
  const handleExpandSlots = () => {
    if (!activeSection) return
    const updated = sections.map(s =>
      s.id === activeSection ? { ...s, maxItems: s.maxItems + 3 } : s
    )
    setSections(updated)
    saveSections(updated)
    showToast('Added 3 more slots', 'success')
  }

  const activeSectionData = sections.find(s => s.id === activeSection)

  return (
    <>
      <div className="admin-page-header">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Home Page Customizer
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.1 }}
        >
          Drag sections to reorder • Click a section to edit its content
        </motion.p>
      </div>

      <div className={`admin-home-editor-grid ${activeSection ? 'has-editor' : ''}`}>
        {/* Left: Section List */}
        <motion.div
          className={`admin-home-section-list ${activeSection ? 'hidden-on-mobile' : ''}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Sections</h2>
            <button
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={() => setShowNewModal(true)}
            >
              <VscAdd size={14} /> New Section
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading sections...</div>
          ) : sections.length === 0 ? (
            <div className="admin-section-card">
              <div className="admin-empty-state">
                <div className="admin-empty-state-icon">📄</div>
                <p>No sections yet. Create your first section to start customizing the home page.</p>
              </div>
            </div>
          ) : (
            <Reorder.Group values={sections} onReorder={handleReorder} axis="y" style={{ listStyle: 'none' }}>
              {sections.map((section) => (
                <Reorder.Item
                  key={section.id}
                  value={section}
                  onDragEnd={handleDragEnd}
                  style={{ listStyle: 'none' }}
                >
                  <div
                    className={`admin-section-drag-card ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(section.id === activeSection ? null : section.id)}
                  >
                    <span className="drag-handle"><VscGripper /></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{section.title}</span>
                        {CORE_KEYS.includes(section.key) && (
                          <span style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(157,0,255,0.2)', color: 'var(--accent)', fontWeight: 700 }}>CORE</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                        {SECTION_TYPES.find(t => t.value === section.type)?.icon}{' '}
                        {section.type} • {section._count.items} items
                        {!section.visible && ' • Hidden'}
                      </div>
                    </div>
                    <button
                      className={`admin-toggle ${section.visible ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleVisibility(section) }}
                    />
                    {!CORE_KEYS.includes(section.key) && (
                      <button
                        className="admin-btn-icon"
                        onClick={(e) => { e.stopPropagation(); deleteSection(section.id) }}
                        style={{ color: 'var(--admin-danger)', padding: '0.35rem' }}
                      >
                        <VscTrash size={14} />
                      </button>
                    )}
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </motion.div>

        {/* Right: Section Content Editor */}
        <AnimatePresence mode="wait">
          {activeSection && activeSectionData && (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="admin-btn-icon admin-mobile-back-btn"
                    onClick={() => setActiveSection(null)}
                    style={{ padding: '0.3rem' }}
                  >
                    <VscArrowLeft size={18} />
                  </button>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                    {activeSectionData.title} — Content
                  </h2>
                </div>
                {!NON_EDITABLE_TYPES.includes(activeSectionData.type) && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Auto-fill gaps:</span>
                    <button
                      className={`admin-toggle ${activeSectionData.autoFill ? 'active' : ''}`}
                      onClick={() => {
                        const updated = sections.map(s =>
                          s.id === activeSection ? { ...s, autoFill: !s.autoFill } : s
                        )
                        setSections(updated)
                        saveSections(updated)
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Visible count control */}
              {!NON_EDITABLE_TYPES.includes(activeSectionData.type) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '12px',
                }}>
                  <span style={{ fontSize: '0.82rem', opacity: 0.7, flex: 1 }}>
                    Visible titles on site:
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={activeSectionData.maxItems}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(50, parseInt(e.target.value) || 1))
                      const updated = sections.map(s =>
                        s.id === activeSection ? { ...s, maxItems: val } : s
                      )
                      setSections(updated)

                      // Debounced auto-save: saves 600ms after user stops typing
                      if (maxItemsTimerRef.current) clearTimeout(maxItemsTimerRef.current)
                      maxItemsTimerRef.current = setTimeout(() => {
                        saveSections(updated)
                      }, 600)
                    }}
                    onBlur={() => {
                      // Cancel pending debounce and save immediately with fresh state
                      if (maxItemsTimerRef.current) clearTimeout(maxItemsTimerRef.current)
                      saveSections(sectionsRef.current)
                    }}
                    className="admin-input"
                    style={{
                      width: '70px',
                      textAlign: 'center',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              )}

              {/* Non-editable section notice */}
              {NON_EDITABLE_TYPES.includes(activeSectionData.type) ? (
                <div className="admin-section-card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
                    {activeSectionData.type === 'continue_watching' ? '▶️' : '🤖'}
                  </div>
                  <p style={{ opacity: 0.6, fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {activeSectionData.type === 'continue_watching'
                      ? 'This section is automatically populated from each user\'s watch history. It cannot be edited from the admin panel.'
                      : 'This section will use AI/algorithm-based recommendations. Coming soon.'
                    }
                  </p>
                  <p style={{ opacity: 0.4, fontSize: '0.78rem', marginTop: '0.75rem' }}>
                    You can still hide or reorder this section.
                  </p>
                </div>
              ) : (
                <>
              {/* Search to add */}
              <div style={{ marginBottom: '1.5rem' }}>
                <AdminSearch
                  onSelect={handleAddItem}
                  placeholder="Search to add content to this section..."
                />
              </div>

              {/* Placeholder Grid */}
              <div className="admin-section-card">
                {itemsLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading items...</div>
                ) : (
                  <>
                    <div className="admin-placeholder-grid">
                      {Array.from({ length: Math.max(activeSectionData.maxItems, sectionItems.length) }).map((_, i) => {
                        const item = sectionItems.find(si => si.position === i)

                        return (
                          <div
                            key={i}
                            className={`admin-placeholder-slot ${item ? 'filled' : ''} ${dragOverSlot === i ? 'dragover' : ''}`}
                            draggable={!!item}
                            onDragStart={(e) => {
                              if (item) {
                                setDragItem(i)
                                e.dataTransfer.effectAllowed = 'move'
                                e.currentTarget.style.opacity = '0.4'
                              }
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.opacity = '1'
                              setDragItem(null)
                              setDragOverSlot(null)
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              setDragOverSlot(i)
                            }}
                            onDragLeave={() => setDragOverSlot(null)}
                            onDrop={(e) => {
                              e.preventDefault()
                              setDragOverSlot(null)

                              // If we're rearranging an existing item
                              if (dragItem !== null && dragItem !== i) {
                                handleMoveItem(dragItem, i)
                                setDragItem(null)
                                return
                              }

                              // If dropping from search
                              const data = e.dataTransfer.getData('application/json')
                              if (data && activeSection) {
                                try {
                                  const searchItem = JSON.parse(data)
                                  handleDropFromSearch(searchItem, i)
                                } catch {}
                              }
                              setDragItem(null)
                            }}
                          >
                            {item ? (
                              <>
                                {item.posterUrl ? (
                                  <img src={item.posterUrl} alt={item.title || ''} style={{ cursor: 'grab' }} />
                                ) : (
                                  <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.7rem', opacity: 0.5, cursor: 'grab' }}>
                                    {item.title || `TMDB #${item.tmdbId}`}
                                  </div>
                                )}
                                
                                {/* Stream Selector Overlay */}
                                <select 
                                  value={item.preferredStream || ''} 
                                  onChange={(e) => handleUpdateStream(item.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    bottom: '0.5rem',
                                    left: '0.5rem',
                                    right: '2rem',
                                    padding: '0.2rem',
                                    fontSize: '0.7rem',
                                    background: 'rgba(0,0,0,0.8)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '4px',
                                    zIndex: 10
                                  }}
                                >
                                  <option value="">Default Stream</option>
                                  {PROVIDERS.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>

                                <button
                                  className="remove-btn"
                                  onClick={() => handleRemoveItem(item.id)}
                                  style={{ zIndex: 11 }}
                                >
                                  ×
                                </button>
                                <span className="slot-number">#{i + 1}</span>
                              </>
                            ) : (
                              <div style={{ opacity: 0.3, fontSize: '1.5rem' }}>+</div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Add more slots button */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                      <button
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => handleExpandSlots()}
                        style={{ fontSize: '0.78rem' }}
                      >
                        + Add More Slots
                      </button>
                    </div>
                  </>
                )}
              </div>
              </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Section Modal */}
      <AnimatePresence>
        {showNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowNewModal(false)}
          >
            <motion.div
              className="admin-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--admin-surface-solid)',
                border: '1px solid var(--admin-border)',
                borderRadius: '20px',
                padding: '2rem',
                width: '100%',
                maxWidth: '420px',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create New Section</h2>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', opacity: 0.5, display: 'block', marginBottom: '0.4rem' }}>Section Title</label>
                <input
                  className="admin-input"
                  placeholder="e.g. Editor's Picks"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', opacity: 0.5, display: 'block', marginBottom: '0.4rem' }}>Section Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {SECTION_TYPES.map(t => (
                    <button
                      key={t.value}
                      className={`admin-btn ${newType === t.value ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                      onClick={() => setNewType(t.value)}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="admin-btn admin-btn-secondary" onClick={() => setShowNewModal(false)}>
                  Cancel
                </button>
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={createSection}
                  disabled={!newTitle.trim()}
                  style={{ opacity: newTitle.trim() ? 1 : 0.5 }}
                >
                  Create Section
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

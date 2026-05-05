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
  { id: 'vidsrc_wtf', name: 'Stream 5' },
  { id: 'vidcore', name: 'Stream 6' },
  { id: 'vidup', name: 'Stream 7' },
  { id: 'peachify', name: 'Stream 8' },
  { id: 'videasy', name: 'Stream 9' },
  { id: 'mapple', name: 'Stream 10' },
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
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
    setSectionItems([])
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
      setHasUnsavedChanges(false)
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

  // Save local changes to API
  const handleSaveChanges = async () => {
    if (!activeSection) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/home/sections/${activeSection}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: sectionItems
            .filter(item => item.position < (activeSectionData?.maxItems || 0))
            .map(item => ({
              tmdbId: item.tmdbId,
              mediaType: item.mediaType,
              position: item.position,
              preferredStream: item.preferredStream || null,
            }))
        })
      })
      if (res.ok) {
        showToast('Changes saved successfully!', 'success')
        setHasUnsavedChanges(false)
        fetchSections()
      } else {
        showToast('Failed to save changes', 'error')
      }
    } catch {
      showToast('Network error while saving', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Helper to add item locally
  const addLocalItem = (item: any, targetPos?: number) => {
    if (!activeSectionData) return
    setSectionItems(prev => {
      let newItems = [...prev]
      const maxItems = activeSectionData.maxItems
      
      let pos = targetPos
      if (pos === undefined) {
        pos = -1
        for (let i = 0; i < maxItems; i++) {
          if (!newItems.find(si => si.position === i)) {
            pos = i
            break
          }
        }
      }

      const itemData = {
        id: `local_${Date.now()}_${Math.random()}`,
        tmdbId: item.id || item.tmdbId,
        mediaType: item.media_type || item.mediaType || 'movie',
        posterUrl: item.poster_path || item.posterUrl ? getImageUrl(item.poster_path || item.posterUrl, 'w185') : undefined,
        title: item.title || item.name || `ID: ${item.id || item.tmdbId}`,
      }

      if (pos !== undefined && pos !== -1 && newItems.length < maxItems && !newItems.find(si => si.position === pos)) {
        // Specific vacant slot
        newItems.push({ ...itemData, position: pos })
      } else {
        // Catalogue full or slot occupied logic
        if (targetPos !== undefined) {
          const existingIdx = newItems.findIndex(si => si.position === targetPos)
          if (existingIdx !== -1) {
            newItems[existingIdx] = { ...itemData, position: targetPos }
          } else {
            newItems.push({ ...itemData, position: targetPos })
          }
        } else {
          // General add when full: push to front, shift right, trim
          newItems = newItems.map(si => ({ ...si, position: si.position + 1 }))
          newItems.push({ ...itemData, position: 0 })
          newItems = newItems.filter(si => si.position < maxItems)
        }
      }
      
      setHasUnsavedChanges(true)
      return newItems
    })
  }

  // Add item to section from search
  const handleAddItem = async (item: any) => {
    if (!activeSection) return
    addLocalItem(item)
    showToast(`Added "${item.title || item.name}" (Unsaved)`, 'info')
  }

  // Remove item from section
  const handleRemoveItem = async (itemId: string) => {
    if (!activeSection) return
    setSectionItems(prev => prev.filter(item => item.id !== itemId))
    setHasUnsavedChanges(true)
  }

  // Move item from one slot to another (reorder)
  const handleMoveItem = async (fromSlot: number, toSlot: number) => {
    if (!activeSection) return
    setSectionItems(prev => {
      const newItems = [...prev]
      const fromIdx = newItems.findIndex(si => si.position === fromSlot)
      const toIdx = newItems.findIndex(si => si.position === toSlot)
      
      if (fromIdx !== -1 && toIdx !== -1) {
        newItems[fromIdx] = { ...newItems[fromIdx], position: toSlot }
        newItems[toIdx] = { ...newItems[toIdx], position: fromSlot }
      } else if (fromIdx !== -1 && toIdx === -1) {
        newItems[fromIdx] = { ...newItems[fromIdx], position: toSlot }
      }
      return newItems
    })
    setHasUnsavedChanges(true)
  }

  const handleDiscardChanges = () => {
    if (activeSection) {
      fetchItems(activeSection)
    }
  }

  // Update item preferred stream
  const handleUpdateStream = async (itemId: string, stream: string) => {
    if (!activeSection) return
    setSectionItems(prev => prev.map(item => item.id === itemId ? { ...item, preferredStream: stream || null } : item))
    setHasUnsavedChanges(true)
  }

  // Drop from search result into a specific slot
  const handleDropFromSearch = async (item: any, position: number) => {
    if (!activeSection) return
    addLocalItem(item, position)
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
                    {hasUnsavedChanges && (
                      <>
                        <button 
                          className="admin-btn admin-btn-secondary admin-btn-sm" 
                          onClick={handleDiscardChanges}
                          disabled={saving}
                        >
                          Discard
                        </button>
                        <button 
                          className="admin-btn admin-btn-primary admin-btn-sm" 
                          onClick={handleSaveChanges}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </>
                    )}
                    <span style={{ fontSize: '0.78rem', opacity: 0.5, marginLeft: '0.5rem' }}>Auto-fill gaps:</span>
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
                      {Array.from({ length: activeSectionData.maxItems }).map((_, i) => {
                        const item = sectionItems.find(si => si.position === i)

                        return (
                          <div
                            key={i}
                            className={`admin-placeholder-slot ${item ? 'filled' : ''} ${dragOverSlot === i ? 'dragover' : ''} ${dragItem === i ? 'dragging' : ''}`}
                            draggable={!!item}
                            style={{ opacity: dragItem === i ? 0.4 : 1 }}
                            onDragStart={(e) => {
                              if (item) {
                                setDragItem(i)
                                e.dataTransfer.effectAllowed = 'move'
                              }
                            }}
                            onDragEnd={(e) => {
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

                                {/* Mobile fallback controls overlay */}
                                <div className="admin-mobile-controls" style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: 0,
                                  right: 0,
                                  transform: 'translateY(-50%)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '0 0.5rem',
                                  pointerEvents: 'none'
                                }}>
                                  {i > 0 && (
                                    <button 
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveItem(i, i - 1); }}
                                      style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: '30px', height: '30px', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                                    >
                                      <VscArrowLeft size={16} />
                                    </button>
                                  )}
                                  {i < activeSectionData.maxItems - 1 && (
                                    <button 
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveItem(i, i + 1); }}
                                      style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: '30px', height: '30px', border: '1px solid rgba(255,255,255,0.2)', color: 'white', marginLeft: 'auto' }}
                                    >
                                      <VscArrowRight size={16} />
                                    </button>
                                  )}
                                </div>

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

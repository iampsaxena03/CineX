'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, useScroll, useMotionValueEvent } from 'motion/react'
import Dock from '@/components/ui/Dock'
import RandomizerModal from '@/components/ui/RandomizerModal'
import { VscHome, VscPlayCircle, VscListSelection, VscFlame, VscSearch, VscSymbolClass, VscWand, VscBookmark, VscPlay } from 'react-icons/vsc'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  const { scrollY } = useScroll()
  const [isHidden, setIsHidden] = useState(false)
  const lastScrollY = useRef(0)
  
  const [isRandomModalOpen, setIsRandomModalOpen] = useState(false)
  const [randomItem, setRandomItem] = useState<any>(null)
  const [isRandomLoading, setIsRandomLoading] = useState(false)

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = lastScrollY.current
    
    // Always show at the very top
    if (latest < 50) {
      setIsHidden(false)
    } 
    // Hide when scrolling down, show when scrolling up
    else if (latest > previous && latest > 150) {
      setIsHidden(true)
    } else if (latest < previous) {
      setIsHidden(false)
    }

    lastScrollY.current = latest
  })

  const handleSurpriseMe = async () => {
    setIsRandomModalOpen(true)
    setIsRandomLoading(true)
    try {
      const res = await fetch('/api/tmdb/random');
      const data = await res.json();
      if (data.url) {
        setRandomItem(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRandomLoading(false)
    }
  };

  // Admin pages use their own dedicated layout with AdminSidebar
  if (isAdmin) return null


  // Desktop: Home, Movies, Series, Genres, Surprise Me, Trending, Search
  // Mobile (<768px): Home, Surprise Me, Search (Movies/Series/Genres hidden via CSS)
  const dockItems = [
    { icon: <VscHome size={22} />, label: 'Home', onClick: () => router.push('/') },
    { icon: <VscPlay size={22} />, label: 'Feed', onClick: () => router.push('/feed') },
    { icon: <VscPlayCircle size={22} />, label: 'Movies', onClick: () => router.push('/movies'), className: 'dock-hide-mobile' },
    { icon: <VscListSelection size={22} />, label: 'Series', onClick: () => router.push('/tv'), className: 'dock-hide-mobile' },
    { icon: <VscWand size={22} />, label: 'Surprise', onClick: handleSurpriseMe },
    { icon: <VscFlame size={22} />, label: 'Trending', onClick: () => router.push('/trending'), className: 'dock-hide-mobile' },
    { icon: <VscBookmark size={22} />, label: 'My List', onClick: () => router.push('/watchlist') },
    { icon: <VscSearch size={22} />, label: 'Search', onClick: () => router.push('/search') },
  ]

  return (
    <>
      {/* ─── Top-Left Pill Logo (Static) ─── */}
      <Link href="/" aria-label="CineXP Home" className="pill-logo" id="pill-logo">
        <div className="pill-logo-sphere" />
      </Link>

      {/* ─── Bottom-Center Glass Dock (Animated on Scroll) ─── */}
      {pathname !== '/feed' && (
        <motion.div 
          className="glass-dock-wrapper" 
          id="glass-dock-wrapper"
          initial={{ x: "-50%", y: 0, opacity: 1 }}
          animate={{ 
            x: "-50%",
            y: isHidden ? 120 : 0,
            opacity: isHidden ? 0 : 1
          }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          <Dock
            items={dockItems}
            baseItemSize={48}
            magnification={74}
            distance={140}
            panelHeight={68}
          />
        </motion.div>
      )}

      <RandomizerModal 
        isOpen={isRandomModalOpen}
        isLoading={isRandomLoading}
        item={randomItem}
        onClose={() => setIsRandomModalOpen(false)}
        onReroll={handleSurpriseMe}
        onConfirm={() => {
          if (randomItem?.url) {
            router.push(randomItem.url)
            setIsRandomModalOpen(false)
          }
        }}
      />
    </>
  )
}

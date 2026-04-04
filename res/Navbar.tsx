'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import Dock from '@/components/ui/Dock'
import { VscHome, VscPlayCircle, VscListSelection, VscFlame, VscSearch, VscSymbolClass } from 'react-icons/vsc'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  // Admin pages keep a simple traditional navbar
  if (isAdmin) {
    return (
      <nav className="navbar" id="main-navbar">
        <div className="navbar-brand">
          <Link href="/" className="navbar-logo">CINEX</Link>
          <span className="navbar-tag">CONTROL</span>
        </div>
        <div className="navbar-links">
          <Link href="/admin" className={`navbar-link ${pathname === '/admin' ? 'active' : ''}`}>Dashboard</Link>
          <Link href="/admin/posts" className={`navbar-link ${pathname.startsWith('/admin/posts') ? 'active' : ''}`}>Library</Link>
          <Link href="/admin/new" className={`navbar-link ${pathname === '/admin/new' ? 'active' : ''}`}>Add New</Link>
        </div>
        <div className="navbar-actions">
          <Link href="/" className="admin-pill">Exit Studio</Link>
        </div>
      </nav>
    )
  }

  // Desktop: Home, Movies, Series, Genres, Trending, Search
  // Mobile (<768px): Home, Trending, Search (Movies/Series/Genres hidden via CSS)
  const dockItems = [
    { icon: <VscHome size={22} />, label: 'Home', onClick: () => router.push('/') },
    { icon: <VscPlayCircle size={22} />, label: 'Movies', onClick: () => router.push('/movies'), className: 'dock-hide-mobile' },
    { icon: <VscListSelection size={22} />, label: 'Series', onClick: () => router.push('/tv'), className: 'dock-hide-mobile' },
    { icon: <VscSymbolClass size={22} />, label: 'Genres', onClick: () => router.push('/genres'), className: 'dock-hide-mobile' },
    { icon: <VscFlame size={22} />, label: 'Trending', onClick: () => router.push('/trending') },
    { icon: <VscSearch size={22} />, label: 'Search', onClick: () => router.push('/search') },
  ]

  return (
    <>
      {/* ─── Top-Left Pill Logo ─── */}
      <Link href="/" aria-label="CineX Home" className="pill-logo" id="pill-logo">
        <div className="pill-logo-sphere" />
      </Link>

      {/* ─── Bottom-Center Glass Dock ─── */}
      <div className="glass-dock-wrapper" id="glass-dock-wrapper">
        <Dock
          items={dockItems}
          baseItemSize={44}
          magnification={68}
          distance={150}
          panelHeight={60}
        />
      </div>
    </>
  )
}

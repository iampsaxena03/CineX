'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { VscDashboard, VscCloudDownload, VscLayout, VscGraph, VscSettingsGear, VscArrowLeft, VscMenu, VscChromeClose } from 'react-icons/vsc'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: <VscDashboard />, exact: true },
  { href: '/admin/downloads', label: 'Downloads', icon: <VscCloudDownload />, exact: false },
  { href: '/admin/home-layout', label: 'Home Layout', icon: <VscLayout />, exact: false },
  { href: '/admin/analytics', label: 'Analytics', icon: <VscGraph />, exact: false },
  { href: '/admin/settings', label: 'Settings', icon: <VscSettingsGear />, exact: false },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <>
      <button 
        className="admin-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <VscChromeClose /> : <VscMenu />}
      </button>

      {mobileOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 140 }} 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-brand">
          <h1>CINEXP</h1>
          <span>Control Panel</span>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-item ${isActive(item) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/" className="admin-exit-btn">
            <VscArrowLeft size={14} />
            Exit to Site
          </Link>
        </div>
      </aside>
    </>
  )
}

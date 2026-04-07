'use client'

import Link from 'next/link'
import { VscCloudDownload, VscLayout, VscGlobe, VscDatabase, VscPlay, VscSymbolClass } from 'react-icons/vsc'
import StatCard from '@/components/admin/StatCard'
import { motion } from 'motion/react'

interface Props {
  movieCount: number
  tvCount: number
  downloadCount: number
  sectionCount: number
  recentLinks: any[]
}

export default function DashboardClient({ movieCount, tvCount, downloadCount, sectionCount, recentLinks }: Props) {
  return (
    <>
      <div className="admin-page-header">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Dashboard
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.5, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Overview of your CineX platform
        </motion.p>
      </div>

      {/* Stats Grid */}
      <motion.div
        className="admin-stats-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <StatCard label="Movies with Downloads" value={movieCount} icon={<VscPlay />} color="var(--primary)" />
        <StatCard label="TV Shows Configured" value={tvCount} icon={<VscSymbolClass />} color="var(--admin-info)" />
        <StatCard label="Total Download Links" value={downloadCount} icon={<VscCloudDownload />} color="var(--admin-success)" />
        <StatCard label="Home Sections" value={sectionCount} icon={<VscLayout />} color="var(--admin-warning)" />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Quick Actions</h2>
        <div className="admin-quick-actions">
          <Link href="/admin/downloads" className="admin-quick-action">
            <div className="admin-quick-action-icon" style={{ background: 'rgba(157, 0, 255, 0.15)' }}>
              <VscCloudDownload />
            </div>
            <div>
              <h3>Add Download Links</h3>
              <p>Search & add movie/series links</p>
            </div>
          </Link>

          <Link href="/admin/home-layout" className="admin-quick-action">
            <div className="admin-quick-action-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
              <VscLayout />
            </div>
            <div>
              <h3>Customize Home Page</h3>
              <p>Manage sections & content</p>
            </div>
          </Link>

          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-quick-action">
            <div className="admin-quick-action-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
              <VscGlobe />
            </div>
            <div>
              <h3>View Live Site</h3>
              <p>Open CineX in new tab</p>
            </div>
          </a>

          <Link href="/admin/settings" className="admin-quick-action">
            <div className="admin-quick-action-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
              <VscDatabase />
            </div>
            <div>
              <h3>Manage Settings</h3>
              <p>Cache, features & more</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        style={{ marginTop: '2rem' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Activity</h2>
        <div className="admin-section-card">
          {recentLinks.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state-icon">📭</div>
              <p>No download links added yet. Start by searching for a movie or TV show.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper" style={{ border: 'none' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Quality</th>
                    <th>Label</th>
                    <th>Size</th>
                    <th>Type</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLinks.map((link) => (
                    <tr key={link.id}>
                      <td>
                        <span className="admin-badge" style={{ background: 'rgba(157, 0, 255, 0.15)', color: 'var(--accent)' }}>
                          {link.quality}
                        </span>
                      </td>
                      <td>{link.label}</td>
                      <td style={{ opacity: 0.6 }}>{link.size}</td>
                      <td>
                        {link.mediaPost ? (
                          <span className={`admin-badge admin-badge-${link.mediaPost.type}`}>
                            {link.mediaPost.type}
                          </span>
                        ) : link.episode ? (
                          <span className="admin-badge admin-badge-tv">
                            S{link.episode.season.seasonNumber}E{link.episode.episodeNumber}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ opacity: 0.4, fontSize: '0.8rem' }}>
                        {new Date(link.createdAt).toISOString().split('T')[0]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

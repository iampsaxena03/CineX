'use client'

import { motion } from 'motion/react'
import StatCard from '@/components/admin/StatCard'
import { VscPlay, VscSymbolClass, VscCloudDownload, VscLayout } from 'react-icons/vsc'

interface Props {
  totalMovies: number
  totalTV: number
  totalDownloads: number
  totalSections: number
  recentDownloads: any[]
  sectionsWithCounts: any[]
}

export default function AnalyticsClient({
  totalMovies, totalTV, totalDownloads, totalSections,
  recentDownloads, sectionsWithCounts
}: Props) {
  return (
    <>
      <div className="admin-page-header">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Analytics
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.1 }}
        >
          Content coverage and platform overview
        </motion.p>
      </div>

      <motion.div
        className="admin-stats-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <StatCard label="Movies Configured" value={totalMovies} icon={<VscPlay />} color="var(--primary)" />
        <StatCard label="TV Shows Configured" value={totalTV} icon={<VscSymbolClass />} color="var(--admin-info)" />
        <StatCard label="Download Links" value={totalDownloads} icon={<VscCloudDownload />} color="var(--admin-success)" />
        <StatCard label="Home Sections" value={totalSections} icon={<VscLayout />} color="var(--admin-warning)" />
      </motion.div>

      <div className="admin-analytics-two-col">
        {/* Recent Downloads */}
        <motion.div
          className="admin-section-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2>Recent Download Links</h2>
          {recentDownloads.length === 0 ? (
            <div className="admin-empty-state">
              <p>No download links added yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentDownloads.map((dl, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                }}>
                  <div>
                    <span className="admin-badge" style={{ background: 'rgba(157,0,255,0.15)', color: 'var(--accent)', marginRight: '0.5rem' }}>
                      {dl.quality}
                    </span>
                    <span style={{ fontSize: '0.85rem' }}>{dl.label}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>
                    {new Date(dl.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Section Overview */}
        <motion.div
          className="admin-section-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2>Home Page Sections</h2>
          {sectionsWithCounts.length === 0 ? (
            <div className="admin-empty-state">
              <p>No sections configured yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sectionsWithCounts.map((section, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                }}>
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{section.title}</span>
                    <div style={{ fontSize: '0.72rem', opacity: 0.4, marginTop: '2px' }}>
                      {section.type} • {section._count.items} manual items
                      {section.autoFill && ' • Auto-fill ON'}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    background: section.visible ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: section.visible ? 'var(--admin-success)' : 'var(--admin-danger)',
                  }}>
                    {section.visible ? 'VISIBLE' : 'HIDDEN'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Content Coverage */}
      <motion.div
        className="admin-section-card"
        style={{ marginTop: '1.5rem' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <h2>Content Coverage</h2>
        <div className="admin-content-coverage-grid">
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.5rem' }}>Movies with Downloads</div>
            <div style={{
              height: 8,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <motion.div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                  borderRadius: 4,
                }}
                initial={{ width: 0 }}
                animate={{ width: totalMovies > 0 ? `${Math.min(100, totalMovies * 5)}%` : '0%' }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.3rem' }}>{totalMovies} configured</div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.5rem' }}>TV Shows with Downloads</div>
            <div style={{
              height: 8,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <motion.div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--admin-info), #93c5fd)',
                  borderRadius: 4,
                }}
                initial={{ width: 0 }}
                animate={{ width: totalTV > 0 ? `${Math.min(100, totalTV * 5)}%` : '0%' }}
                transition={{ duration: 1, delay: 0.6 }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.3rem' }}>{totalTV} configured</div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.5rem' }}>Total Download Links</div>
            <div style={{
              height: 8,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <motion.div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--admin-success), #6ee7b7)',
                  borderRadius: 4,
                }}
                initial={{ width: 0 }}
                animate={{ width: totalDownloads > 0 ? `${Math.min(100, totalDownloads * 2)}%` : '0%' }}
                transition={{ duration: 1, delay: 0.7 }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.3rem' }}>{totalDownloads} links</div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

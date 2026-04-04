'use client'

import { useState, useEffect } from 'react'

interface StreamPlayerProps {
  embedUrl: string | null | undefined
}

export default function StreamPlayer({ embedUrl }: StreamPlayerProps) {
  const [loaded, setLoaded] = useState(false)

  // Fallback: forcefully show the player after 3.5 seconds in case
  // the iframe onload event is blocked by cross-origin security policies.
  useEffect(() => {
    if (!embedUrl) return
    setLoaded(false)
    const timer = setTimeout(() => setLoaded(true), 3500)
    return () => clearTimeout(timer)
  }, [embedUrl])

  if (!embedUrl) {
    return (
      <div className="stream-player" style={{ width: '100%', height: '100%' }}>
        <div className="stream-placeholder">
          <p>No streaming source available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stream-player" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {!loaded && (
        <div className="stream-placeholder stream-placeholder-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0510' }}>
          <p>Loading player...</p>
        </div>
      )}

      <iframe
        src={embedUrl}
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="origin"
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.4s ease'
        }}
      />
    </div>
  )
}

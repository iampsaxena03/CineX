'use client'

import { useEffect } from 'react'

const LOCAL_VERSION_KEY = 'cinexp_cache_version'

/**
 * All localStorage keys used across the app that should be 
 * wiped when the admin triggers a "Clear All Users' Browser Cache".
 */
const CACHE_KEYS_TO_CLEAR = [
  'cinexp_watch_history',
  'cinexp_watchlist',
  'cinexpHistory',
  'vidLinkProgress',
  'vidFastProgress',
  'pwa-installed',
  'pwa-prompt-dismissed',
]

export default function CacheBuster() {
  useEffect(() => {
    let cancelled = false

    async function checkVersion() {
      try {
        const res = await fetch('/api/cache-version', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const { version } = await res.json()
        const localVersion = localStorage.getItem(LOCAL_VERSION_KEY)

        if (localVersion !== null && localVersion !== version) {
          // Version mismatch — the admin triggered a cache bust
          console.log(`[CacheBuster] Version changed ${localVersion} → ${version}. Clearing browser cache…`)
          
          for (const key of CACHE_KEYS_TO_CLEAR) {
            localStorage.removeItem(key)
          }

          // Also clear any StreamPlayer cached data (dynamic keys like "stream_*")
          const allKeys = Object.keys(localStorage)
          for (const key of allKeys) {
            if (key.startsWith('stream_')) {
              localStorage.removeItem(key)
            }
          }
        }

        // Always store the latest version
        localStorage.setItem(LOCAL_VERSION_KEY, version)
      } catch {
        // Silently fail — don't break the app if the endpoint is down
      }
    }

    checkVersion()

    return () => {
      cancelled = true
    }
  }, [])

  return null // Invisible component
}

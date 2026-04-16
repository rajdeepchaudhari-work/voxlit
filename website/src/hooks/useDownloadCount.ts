import { useEffect, useState } from 'react'

const API_URL = 'https://api.github.com/repos/rajdeepchaudhari-work/voxlit/releases'
const CACHE_KEY = 'voxlit-download-count'
const CACHE_TTL_MS = 60 * 60 * 1000   // 1 hour

interface Cache {
  count: number
  timestamp: number
}

/**
 * Sums download_count across every asset on every GitHub release.
 * Caches in localStorage for 1 hour so we don't burn the unauth API quota.
 * Returns null while loading or on failure — caller can render a fallback.
 */
export function useDownloadCount(): number | null {
  const [count, setCount] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const cached = JSON.parse(raw) as Cache
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.count
      return null
    } catch { return null }
  })

  useEffect(() => {
    // Don't refetch if cache is still warm
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const cached = JSON.parse(raw) as Cache
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) return
      }
    } catch {}

    let cancelled = false
    fetch(API_URL)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((releases: Array<{ assets: Array<{ download_count: number; name: string }> }>) => {
        if (cancelled) return
        // Only count the DMG and ZIP downloads — ignore blockmaps and yml manifests
        // which get fetched by the updater automatically.
        const total = releases.reduce((sum, r) => {
          return sum + r.assets.reduce((s, a) => {
            const n = a.name.toLowerCase()
            if (n.endsWith('.dmg') || n.endsWith('.zip')) return s + (a.download_count || 0)
            return s
          }, 0)
        }, 0)
        setCount(total)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ count: total, timestamp: Date.now() }))
        } catch {}
      })
      .catch(() => { /* silent — caller renders fallback */ })

    return () => { cancelled = true }
  }, [])

  return count
}

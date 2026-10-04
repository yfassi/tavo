'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { TemplateRenderer } from '@/components/templates/template-renderer'
import { createBrowserClient } from '@/lib/supabase/client'
import type { TemplateSlotData } from '@/lib/types/template'

interface TVPlayerProps {
  tokenHash: string
  venueId: string
  initialData: {
    template: { slug: string }
    slotData: TemplateSlotData
    screen: { orientation: string }
  }
}

export function TVPlayer({ tokenHash, venueId, initialData }: TVPlayerProps) {
  const [data, setData] = useState(initialData)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tv/data/${tokenHash}`)
      if (res.ok) {
        const newData = await res.json()
        setData(newData)
      }
    } catch {
      // Offline — keep cached data
    }
  }, [tokenHash])

  // Supabase Realtime — listen for menu/venue changes
  useEffect(() => {
    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`venue:${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () =>
        fetchData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_item_prices' }, () =>
        fetchData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categories' }, () =>
        fetchData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_kits' }, () =>
        fetchData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [venueId, fetchData])

  // Heartbeat — every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/tv/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenHash }),
      }).catch(() => {})
    }, 60000)

    // Initial heartbeat
    fetch('/api/tv/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenHash }),
    }).catch(() => {})

    return () => clearInterval(interval)
  }, [tokenHash])

  // Wake Lock — prevent screen sleep
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake Lock not supported or denied
      }
    }

    requestWakeLock()

    // Re-acquire on visibility change
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      wakeLockRef.current?.release()
    }
  }, [])

  // Register service worker for offline support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const format = data.screen.orientation === 'portrait' ? 'portrait' : 'landscape'

  return (
    <div className="h-screen w-screen bg-black">
      <TemplateRenderer
        slug={data.template.slug}
        data={data.slotData}
        format={format as 'landscape' | 'portrait'}
      />
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type GoogleAnalyticsPageTrackerProps = {
  measurementId: string
}

type Gtag = (command: string, action: string, params: Record<string, string>) => void

declare global {
  interface Window {
    gtag?: Gtag
  }
}

export function GoogleAnalyticsPageTracker({ measurementId }: GoogleAnalyticsPageTrackerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname || typeof window === 'undefined' || typeof window.gtag !== 'function') {
      return
    }

    const queryString = searchParams.toString()
    const pagePath = queryString ? `${pathname}?${queryString}` : pathname

    window.gtag('event', 'page_view', {
      page_location: window.location.href,
      page_path: pagePath,
      send_to: measurementId,
    })
  }, [measurementId, pathname, searchParams])

  return null
}

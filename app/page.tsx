'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

function trackLp(event: string, properties?: Record<string, string>) {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: `lp_${event}`, properties }),
    })
  } catch {
    // fire-and-forget
  }
}

export default function ABRouter() {
  const router = useRouter()

  useEffect(() => {
    let variant = localStorage.getItem('lp_variant')

    if (!variant) {
      variant = Math.random() < 0.5 ? 'A' : 'B'
      localStorage.setItem('lp_variant', variant)
      trackLp('variant_assigned', { variant })
    }

    router.replace(variant === 'A' ? '/lp/a' : '/lp/b')
  }, [router])

  return null
}

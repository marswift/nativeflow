'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const INACTIVITY_MS = 30 * 60 * 1000
const WARNING_MS = 25 * 60 * 1000
const CHECK_INTERVAL_MS = 15 * 1000

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const

export default function SessionTimeout() {
  const router = useRouter()
  const lastActivityAt = useRef<number>(Date.now())
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const warningShownRef = useRef(false)
  const signingOut = useRef(false)
  const continueButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    warningShownRef.current = showWarning
  }, [showWarning])

  // Focus primary action when dialog opens. Only runs while dialog is visible; cleanup cancels pending focus.
  useEffect(() => {
    if (!showWarning) return
    const t = setTimeout(() => continueButtonRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [showWarning])

  const signOutAndRedirect = useCallback(async () => {
    if (signingOut.current) return
    signingOut.current = true
    setShowWarning(false)
    if (intervalId.current) {
      clearInterval(intervalId.current)
      intervalId.current = null
    }
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore; redirect regardless so user is never stuck
    } finally {
      router.replace('/login?reason=session_expired')
    }
  }, [router])

  useEffect(() => {
    const onActivity = () => {
      lastActivityAt.current = Date.now()
      if (warningShownRef.current) setShowWarning(false)
    }

    const check = () => {
      if (signingOut.current) return
      const elapsed = Date.now() - lastActivityAt.current
      if (elapsed >= INACTIVITY_MS) {
        if (document.visibilityState === 'visible') signOutAndRedirect()
        return
      }
      if (document.visibilityState === 'visible') {
        if (elapsed >= WARNING_MS) setShowWarning(true)
        else setShowWarning(false)
      }
    }

    EVENTS.forEach((ev) => {
      window.addEventListener(ev, onActivity, { passive: true })
    })

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActivityAt.current
        if (elapsed >= INACTIVITY_MS) {
          signOutAndRedirect()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    intervalId.current = setInterval(check, CHECK_INTERVAL_MS)
    check()

    return () => {
      EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity))
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (intervalId.current) {
        clearInterval(intervalId.current)
        intervalId.current = null
      }
    }
  }, [signOutAndRedirect])

  const handleContinue = useCallback(() => {
    lastActivityAt.current = Date.now()
    setShowWarning(false)
  }, [])

  const handleLogoutNow = useCallback(() => {
    signOutAndRedirect()
  }, [signOutAndRedirect])

  // Escape continues session when dialog is visible. Listener only active while showWarning is true.
  useEffect(() => {
    if (!showWarning) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleContinue()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showWarning, handleContinue])

  if (!showWarning) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#faf8f5',
          borderRadius: 12,
          border: '1px solid #e8e4df',
          maxWidth: 400,
          width: '100%',
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        }}
      >
        <h2
          id="session-timeout-title"
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            color: '#2c2c2c',
          }}
        >
          セッションの有効期限が近づいています
        </h2>
        <p
          style={{
            margin: '12px 0 20px',
            fontSize: 14,
            lineHeight: 1.5,
            color: '#5c5c5c',
          }}
        >
          セキュリティのため、一定時間操作がないと自動でログアウトされます。まもなくログアウトのタイミングです。このまま続けますか？
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleLogoutNow}
            style={{
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 500,
              color: '#5c5c5c',
              background: 'transparent',
              border: '1px solid #e8e4df',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            今すぐログアウト
          </button>
          <button
            ref={continueButtonRef}
            type="button"
            onClick={handleContinue}
            style={{
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              background: '#d97706',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            セッションを続ける
          </button>
        </div>
      </div>
    </div>
  )
}

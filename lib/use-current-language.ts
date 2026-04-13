'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabaseBrowserClient } from './supabase/browser-client'
import type { TargetLanguageCode } from './constants'

const supabase = getSupabaseBrowserClient()

/**
 * 全ページで共有する学習言語のSingle Source of Truth hook。
 * user_profiles.current_learning_language を読み、変更も担う。
 * dashboardのhandleChangeLanguageロジックをベースに統一。
 */
export function useCurrentLanguage() {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function fetchLang() {
      // Use getSession() instead of getUser() to avoid auth token lock contention.
      // getSession() reads from local cache; getUser() makes a network call that
      // acquires a lock and can conflict with other concurrent auth operations.
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user || !isActive) return

      setUserId(user.id)

      const { data } = await supabase
        .from('user_profiles')
        .select('current_learning_language')
        .eq('id', user.id)
        .single()

      if (isActive && data?.current_learning_language) {
        setCurrentLanguage(data.current_learning_language)
      }
    }

    fetchLang()
    return () => {
      isActive = false
    }
  }, [])

  const handleChangeLanguage = useCallback(
    async (lang: string) => {
      if (!userId) return
  
      const nextLanguage = lang as TargetLanguageCode
      if (!nextLanguage || nextLanguage === currentLanguage) return
  
      const previousLanguage = currentLanguage
      setCurrentLanguage(nextLanguage)
  
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()
  
        const accessToken = session?.access_token
  
        if (sessionError || !accessToken) {
          console.error('Failed to get access token for language change', sessionError)
          setCurrentLanguage(previousLanguage)
          return
        }
  
        const res = await fetch('/api/user/change-language', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ language: nextLanguage }),
        })
  
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          console.error('Failed to change language', data)
          setCurrentLanguage(previousLanguage)
        }
      } catch (error) {
        console.error('Unexpected error while changing language', error)
        setCurrentLanguage(previousLanguage)
      }
    },
    [userId, currentLanguage]
  )

  return { currentLanguage, handleChangeLanguage }
}
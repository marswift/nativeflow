'use client'

/**
 * Admin MFA Setup — TOTP enrollment and verification.
 *
 * Required for owner/admin/staff to access admin pages.
 * Uses Supabase Auth MFA APIs.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { getSupabaseBrowserClient } from '../../../lib/supabase/browser-client'

const supabase = getSupabaseBrowserClient()

/** Fire-and-forget audit log for MFA events */
function logMfaAudit(eventType: string, metadata?: Record<string, unknown>) {
  supabase.auth.getSession().then(({ data: { session } }: { data: { session: { access_token: string } | null } }) => {
    if (!session) return
    fetch('/api/admin/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ event_type: eventType, metadata }),
      keepalive: true,
    }).catch(() => {})
  }).catch(() => {})
}

type MfaStep = 'loading' | 'enroll' | 'verify' | 'done' | 'error'

export default function AdminMfaSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<MfaStep>('loading')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [totpSecret, setTotpSecret] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace('/login')
        return
      }

      // Check if already AAL2
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.currentLevel === 'aal2') {
        setStep('done')
        return
      }

      // Check if factor already enrolled but needs verification
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.[0]

      if (totpFactor?.status === 'verified') {
        // Factor exists but session is AAL1 — need to challenge + verify
        setFactorId(totpFactor.id)
        setStep('verify')
        return
      }

      if (totpFactor?.status === 'unverified') {
        // Enrollment started but not completed — re-enroll
        await supabase.auth.mfa.unenroll({ factorId: totpFactor.id })
      }

      // Start new enrollment
      const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'NativeFlow Admin',
      })

      if (enrollError || !enrollData) {
        setErrorMsg(enrollError?.message ?? 'MFA enrollment failed')
        setStep('error')
        return
      }

      setFactorId(enrollData.id)
      setTotpSecret(enrollData.totp.secret)
      logMfaAudit('mfa_enroll_start')
      try {
        const dataUrl = await QRCode.toDataURL(enrollData.totp.uri, { width: 200, margin: 2 })
        setQrDataUrl(dataUrl)
      } catch { /* fallback: secret text will be shown */ }
      setStep('enroll')
    }

    init()
  }, [router])

  async function handleVerify() {
    if (!code.trim() || code.trim().length !== 6) {
      setErrorMsg('6桁のコードを入力してください')
      return
    }

    setVerifying(true)
    setErrorMsg('')

    try {
      // Create challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (challengeError || !challenge) {
        setErrorMsg(challengeError?.message ?? 'Challenge failed')
        setVerifying(false)
        return
      }

      // Verify
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      })

      if (verifyError) {
        logMfaAudit('mfa_verify_failure', { reason: verifyError.message })
        setErrorMsg('コードが正しくありません。再度お試しください。')
        setVerifying(false)
        return
      }

      logMfaAudit('mfa_verify_success')

      setStep('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">MFA状態を確認中...</p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-sm rounded-xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm">
          <p className="text-2xl font-black text-green-600">MFA設定完了</p>
          <p className="mt-2 text-sm text-gray-600">二要素認証が有効になりました。</p>
          <button
            type="button"
            onClick={() => router.replace('/admin/language')}
            className="mt-6 rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-gray-900"
          >
            管理画面へ
          </button>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-sm rounded-xl border border-red-200 bg-white px-6 py-8 text-center shadow-sm">
          <p className="text-lg font-bold text-red-600">エラー</p>
          <p className="mt-2 text-sm text-gray-600">{errorMsg}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-gray-900"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-6 py-8 shadow-sm">
        <h1 className="text-xl font-black text-gray-900">二要素認証（MFA）の設定</h1>
        <p className="mt-2 text-sm text-gray-600">
          管理画面へのアクセスには二要素認証が必要です。
          認証アプリ（Google Authenticator等）を使用して設定してください。
        </p>

        {step === 'enroll' && totpSecret && (
          <div className="mt-6">
            <p className="text-sm font-bold text-gray-700">1. QRコードをスキャン</p>
            <div className="mt-3 flex justify-center rounded-lg border border-gray-200 bg-gray-50 p-4">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="MFA QR Code" width={200} height={200} />
              ) : totpSecret ? (
                <div className="text-center">
                  <p className="text-xs text-gray-500">QRコードを読み取れない場合、手動で入力してください</p>
                  <p className="mt-1 text-xs text-gray-400">アカウント: NativeFlow Admin</p>
                  <p className="mt-2 select-all rounded bg-gray-100 px-3 py-2 font-mono text-sm font-bold tracking-wider text-gray-800">{totpSecret}</p>
                </div>
              ) : null}
            </div>
            <p className="mt-4 text-sm font-bold text-gray-700">2. 認証コードを入力</p>
          </div>
        )}

        {step === 'verify' && (
          <div className="mt-6">
            <p className="text-sm text-gray-600">
              認証アプリに表示されている6桁のコードを入力してください。
            </p>
          </div>
        )}

        <div className="mt-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-gray-900"
          />
        </div>

        {errorMsg && (
          <p className="mt-3 text-center text-sm font-bold text-red-600">{errorMsg}</p>
        )}

        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying || code.length !== 6}
          className="mt-4 w-full rounded-lg bg-gray-800 py-3 text-sm font-bold text-white transition hover:bg-gray-900 disabled:opacity-50"
        >
          {verifying ? '確認中...' : '確認する'}
        </button>
      </div>
    </div>
  )
}

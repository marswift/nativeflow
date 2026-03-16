import { Suspense } from 'react'
import { AuthConfirmClient } from './auth-confirm-client'

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4ef]" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <p className="text-[#4a4a6a]">確認中...</p>
      </div>
    }>
      <AuthConfirmClient />
    </Suspense>
  )
}

import { Suspense } from 'react'
import { ResetPasswordClient } from './reset-password-client'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4ef]" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <p className="text-[#4a4a6a]">読み込み中...</p>
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  )
}

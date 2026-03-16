import { Suspense } from 'react'
import { LoginClient } from './login-client'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4ef]" style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
        <p className="text-[#4a4a6a]">読み込み中...</p>
      </div>
    }>
      <LoginClient />
    </Suspense>
  )
}

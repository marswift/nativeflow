import { Suspense } from 'react'
import { SignupClient } from './signup-client'

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f7f4ef]">
        <p className="text-[#4a4a6a]">読み込み中...</p>
      </div>
    }>
      <SignupClient />
    </Suspense>
  )
}

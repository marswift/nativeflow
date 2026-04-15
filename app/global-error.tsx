'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Nunito','Hiragino Sans',sans-serif" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>エラーが発生しました</h2>
          <button
            onClick={() => reset()}
            style={{ marginTop: 16, padding: '10px 24px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
          >
            もう一度試す
          </button>
        </div>
      </body>
    </html>
  )
}

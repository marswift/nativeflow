import type { CSSProperties } from 'react'

const C = {
  dark: '#1a1a2e',
  white: '#ffffff',
  border: '#ede9e2',
} as const

const containerStyle: CSSProperties = {
  background: C.white, borderRadius: 20, padding: '32px 40px',
  boxShadow: '0 2px 16px rgba(0,0,0,.05)', border: `1.5px solid ${C.border}`,
}
const headerStyle: CSSProperties = {
  background: `linear-gradient(160deg, ${C.white} 55%, #fff8f2 100%)`,
  borderBottom: `1px solid ${C.border}`, padding: '56px 40px 48px',
}
const heroInnerStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', textAlign: 'center' }
const mainStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '40px 40px 80px' }

const ROWS: { th: string; td: string }[] = [
  { th: '会社名', td: '株式会社Marswift' },
  { th: '代表者', td: '石田 昌宏' },
  { th: '所在地', td: '東京都板橋区中台1-23-5' },
  { th: '事業内容', td: 'AI語学学習サービスの開発・運営' },
  { th: '運営サービス', td: 'NativeFlow（usenativeflow.com）' },
  { th: 'お問い合わせ', td: 'info@usenativeflow.com' },
]

export default function CompanyPage() {
  return (
    <>
      <style>{`
        .legal-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .legal-table th { text-align: left; padding: 14px 20px 14px 0; font-weight: 700; color: #4a4a6a; vertical-align: top; width: 200px; }
        .legal-table td { padding: 14px 0; color: #1a1a2e; line-height: 1.65; }
        .legal-table tr { border-bottom: 1px solid #ede9e2; }
        .legal-table tbody tr:last-child { border-bottom: none; }
        @media (max-width: 768px) {
          .legal-table th { width: 140px; padding-right: 16px; font-size: 13px; }
          .legal-table td { font-size: 13px; }
        }
      `}</style>

      <header className="legal-hero-wrap" style={headerStyle}>
        <div style={heroInnerStyle}>
          <h1 className="legal-title">会社情報</h1>
        </div>
      </header>

      <div className="legal-main" style={mainStyle}>
        <div className="legal-content-box" style={containerStyle}>
          <table className="legal-table">
            <tbody>
              {ROWS.map(({ th, td }) => (
                <tr key={th}>
                  <th>{th}</th>
                  <td>{td}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

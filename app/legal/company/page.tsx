import type { CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const C = {
  dark: '#1a1a2e',
  mid: '#4a4a6a',
  light: '#f7f4ef',
  white: '#ffffff',
  border: '#ede9e2',
} as const

const containerStyle: CSSProperties = {
  background: C.white,
  borderRadius: 20,
  padding: '32px 40px',
  boxShadow: '0 2px 16px rgba(0,0,0,.05)',
  border: `1.5px solid ${C.border}`,
}

const pageWrapStyle: CSSProperties = {
  fontFamily: "'Nunito','Hiragino Sans',sans-serif",
  background: C.light,
  color: C.dark,
  minHeight: '100vh',
}

const navStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 300,
  background: C.white,
  borderBottom: `1px solid ${C.border}`,
  padding: '0 40px',
}

const navInnerStyle: CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  height: 72,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const logoLinkStyle: CSSProperties = { display: 'flex', alignItems: 'center', textDecoration: 'none' }
const logoImgStyle: CSSProperties = { height: 44, width: 'auto' }
const navDateStyle: CSSProperties = { fontSize: 12, color: C.mid, fontWeight: 600 }

const headerStyle: CSSProperties = {
  background: `linear-gradient(160deg, ${C.white} 55%, #fff8f2 100%)`,
  borderBottom: `1px solid ${C.border}`,
  padding: '56px 40px 48px',
}

const heroInnerStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', textAlign: 'center' }

const mainStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '40px 40px 80px' }

const footerWrapStyle: CSSProperties = {
  borderTop: `1px solid ${C.border}`,
  padding: '40px',
  background: C.white,
}

const footerGridStyle: CSSProperties = {
  maxWidth: 1140,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr 1fr',
  gap: 40,
}

const footerLogoWrapStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }
const footerLogoImgStyle: CSSProperties = { height: 40, width: 'auto' }
const footerTaglineStyle: CSSProperties = { fontSize: 13, color: '#aaa', lineHeight: 1.7, maxWidth: 240 }
const footerColTitleStyle: CSSProperties = { fontWeight: 800, fontSize: 14, marginBottom: 14, color: C.dark }
const footerLinkStyle: CSSProperties = { display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }

const footerBottomStyle: CSSProperties = {
  maxWidth: 1140,
  margin: '28px auto 0',
  paddingTop: 24,
  borderTop: `1px solid ${C.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const footerBottomPStyle: CSSProperties = { fontSize: 13, color: '#bbb' }
const footerBottomP2Style: CSSProperties = { fontSize: 12, color: '#bbb' }

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
    <div style={pageWrapStyle}>
      <style>{`
        .legal-title { font-size: 36px; font-weight: 900; color: #1a1a2e; margin-bottom: 0; letter-spacing: -0.5px; line-height: 1.2; }
        .legal-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .legal-table th { text-align: left; padding: 14px 20px 14px 0; font-weight: 700; color: #4a4a6a; vertical-align: top; width: 200px; }
        .legal-table td { padding: 14px 0; color: #1a1a2e; line-height: 1.65; }
        .legal-table tr { border-bottom: 1px solid #ede9e2; }
        .legal-table tbody tr:last-child { border-bottom: none; }
        .lp-footer-bottom { flex-wrap: wrap; }
        .legal-logo-link:hover { opacity: 0.85; }
        .legal-logo-link:focus-visible { outline: 2px solid #ede9e2; outline-offset: 2px; border-radius: 4px; }
        .legal-footer-link { transition: color 0.15s ease; }
        .legal-footer-link:hover { color: #5c5c5c; }
        .legal-footer-link:focus-visible { outline: 2px solid #ede9e2; outline-offset: 2px; border-radius: 2px; }
        @media (max-width: 768px) {
          .legal-nav { padding-left: 24px !important; padding-right: 24px !important; }
          .legal-hero-wrap { padding: 40px 24px 36px !important; }
          .legal-title { font-size: 28px !important; }
          .legal-main { padding: 32px 24px 64px !important; }
          .legal-content-box { padding: 24px 20px !important; }
          .legal-table th { width: 140px; padding-right: 16px; font-size: 13px; }
          .legal-table td { font-size: 13px; }
          .lp-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
          .legal-footer-wrap { padding: 32px 24px !important; }
          .lp-footer-bottom { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }
        @media (max-width: 480px) {
          .lp-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <nav className="legal-nav" style={navStyle}>
        <div style={navInnerStyle}>
          <Link href="/" style={logoLinkStyle} className="legal-logo-link">
            <Image src="/header_logo.svg" alt="NativeFlow" width={200} height={48} style={logoImgStyle} />
          </Link>
          <span style={navDateStyle}>最終更新日：2026年3月11日</span>
        </div>
      </nav>

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

      <footer className="lp-footer legal-footer-wrap" style={footerWrapStyle}>
        <div className="lp-footer-grid" style={footerGridStyle}>
          <div>
            <div style={footerLogoWrapStyle}>
              <Link href="/" style={logoLinkStyle} className="legal-logo-link">
                <Image src="/footer_logo.svg" alt="NativeFlow" width={200} height={40} className="lp-logo-footer" style={footerLogoImgStyle} />
              </Link>
            </div>
            <p style={footerTaglineStyle}>Speak with AI. Learn like a native.</p>
          </div>
          <div>
            <div style={footerColTitleStyle}>プロダクト</div>
            <Link href="/#features" style={footerLinkStyle} className="legal-footer-link">特徴</Link>
            <Link href="/#scenes" style={footerLinkStyle} className="legal-footer-link">学習方法</Link>
            <Link href="/#pricing" style={footerLinkStyle} className="legal-footer-link">料金プラン</Link>
            <Link href="/#faq" style={footerLinkStyle} className="legal-footer-link">よくある質問</Link>
          </div>
          <div>
            <div style={footerColTitleStyle}>法的情報</div>
            <Link href="/legal/privacy" style={footerLinkStyle} className="legal-footer-link">プライバシーポリシー</Link>
            <Link href="/legal/terms" style={footerLinkStyle} className="legal-footer-link">利用規約</Link>
            <Link href="/legal/tokusho" style={footerLinkStyle} className="legal-footer-link">特定商取引法に基づく表記</Link>
            <Link href="/legal/company" style={footerLinkStyle} className="legal-footer-link">会社情報</Link>
          </div>
          <div>
            <div style={footerColTitleStyle}>サポート</div>
            <Link href="/contact" style={footerLinkStyle} className="legal-footer-link">お問い合わせ</Link>
          </div>
        </div>
        <div className="lp-footer-bottom" style={footerBottomStyle}>
          <p style={footerBottomPStyle}>© 2026 NativeFlow. All rights reserved.</p>
          <p style={footerBottomP2Style}>Speak with AI. Learn like a native.</p>
        </div>
      </footer>
    </div>
  )
}

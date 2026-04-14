import AppHeader from '@/components/header/app-header'
import AppFooter, { LP_FOOTER_CSS } from '@/components/footer/app-footer'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Nunito','Hiragino Sans',sans-serif",
      background: '#f7f4ef',
      color: '#1a1a2e',
      minHeight: '100vh',
    }}>
      <style>{`
        .legal-title { font-size: 36px; font-weight: 900; color: #1a1a2e; margin-bottom: 0; letter-spacing: -0.5px; line-height: 1.2; }
        .lp-footer-bottom { flex-wrap: wrap; }
        ${LP_FOOTER_CSS}
        @media (max-width: 1024px) {
          .lp-header-offset{height:56px !important}
          .legal-hero-wrap { padding: 40px 24px 36px !important; }
          .legal-title { font-size: 28px !important; }
          .legal-main { padding: 32px 24px 64px !important; }
          .legal-content-box { padding: 24px 20px !important; }
        }
      `}</style>

      <AppHeader />
      <div className="lp-header-offset" style={{height:72}} />

      {children}

      <AppFooter />
    </div>
  )
}

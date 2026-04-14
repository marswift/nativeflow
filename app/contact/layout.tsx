import AppHeader from '@/components/header/app-header'
import AppFooter, { LP_FOOTER_CSS } from '@/components/footer/app-footer'

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Nunito','Hiragino Sans',sans-serif",
      background: '#f7f4ef',
      color: '#1a1a2e',
      minHeight: '100vh',
    }}>
      <style>{`
        .lp-footer-bottom { flex-wrap: wrap; }
        ${LP_FOOTER_CSS}
        @media (max-width: 1024px) {
          .lp-header-offset{height:56px !important}
        }
      `}</style>

      <AppHeader />
      <div className="lp-header-offset" style={{height:72}} />

      {children}

      <AppFooter />
    </div>
  )
}

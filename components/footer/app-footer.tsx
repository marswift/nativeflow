import Link from 'next/link'
import Image from 'next/image'

const C = {
  dark: '#1a1a2e',
  border: '#ede9e2',
}

export default function AppFooter() {
  return (
    <footer className="lp-footer" style={{ borderTop: `1px solid ${C.border}`, padding: '40px', background: '#fff' }}>
      <div className="lp-footer-grid" style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
              <Image
                src="/images/branding/footer_logo.svg"
                alt="NativeFlow"
                width={200} height={40}
                className="lp-logo-footer"
                style={{ height: 40, width: 'auto' }}
              />
            </Link>
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14, color: C.dark }}>プロダクト</div>
          <Link href="#features" style={{ display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }}>特徴</Link>
          <Link href="#scenes" style={{ display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }}>学習方法</Link>
          <Link href="#pricing" style={{ display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }}>料金プラン</Link>
          <Link href="#faq" style={{ display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }}>よくある質問</Link>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14, color: C.dark }}>法的情報</div>
          <Link href="/legal/privacy" style={{ display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }}>プライバシーポリシー</Link>
          <Link href="/legal/terms" style={{ display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }}>利用規約</Link>
          <Link href="/legal/tokusho" style={{ display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }}>特定商取引法に基づく表記</Link>
          <Link href="/legal/company" style={{ display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }}>会社情報</Link>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14, color: C.dark }}>サポート</div>
          <Link href="/contact" style={{ display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }}>お問い合わせ</Link>
        </div>
      </div>
      <div className="lp-footer-bottom" style={{ maxWidth: 1140, margin: '16px auto 0', paddingTop: 16, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 12, color: '#bbb' }}>© 2026 NativeFlow. All rights reserved.</p>
        <p style={{ fontSize: 11, color: '#ccc' }}>Speak with AI. Learn like a native.</p>
      </div>
    </footer>
  )
}

/** CSS classes required for footer responsive behavior — include in page <style> tag */
export const LP_FOOTER_CSS = `
  .lp-logo-footer{height:42px;width:auto;display:block;object-fit:contain}
  @media (max-width:1024px){
    .lp-footer{display:none !important}
  }
  @media (max-width:480px){
    .lp-footer-grid{grid-template-columns:1fr !important}
  }
`

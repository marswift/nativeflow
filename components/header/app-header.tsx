'use client'

import Link from 'next/link'
import Image from 'next/image'

type AppHeaderProps = {
  /** When provided, renders authenticated nav (マイページ + ログアウト). Otherwise renders the public top-page nav. */
  onLogout?: () => void
  /** Display-only — no interactive switching */
  currentLanguage?: string
  /** @deprecated No longer used. Kept for backward compatibility. */
  onChangeLanguage?: (lang: string) => void
  /** Current scroll position — controls blur/border on public mode. */
  scrollY?: number
}

const C = {
  orange: '#ff6b35',
  yellow: '#f7c948',
  dark: '#1a1a2e',
  mid: '#4a4a6a',
  white: '#ffffff',
  border: '#ede9e2',
}

const NAV_CSS = `
  html{scroll-behavior:smooth}
  section[id]{scroll-margin-top:72px}
  .lp-nav{position:fixed;top:0;left:0;right:0;z-index:1000}
  .lp-nav-inner,.lp-nav-right,.lp-nav-links{position:relative;z-index:301}
  .lp-nav-links{display:flex;align-items:center;gap:32px}
  .lp-nav-menu-link{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 10px;position:relative;z-index:302;cursor:pointer !important;pointer-events:auto}
  .lp-nav-menu-link,.lp-nav-menu-link *,.lp-nav-links a{cursor:pointer !important}
  .lp-logo-header{height:48px;width:auto;display:block;object-fit:contain}
  .lp-logo-wrap{display:inline-flex;align-items:center;background:transparent}
  .btn-fill{display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#ff6b35,#f7c948);color:white;border-radius:12px;font-weight:900;font-size:15px;font-family:'Nunito',sans-serif;border:none;cursor:pointer;box-shadow:0 4px 18px rgba(255,107,53,.32);transition:all .18s;animation:pulse 2.4s ease-in-out infinite}
  .btn-fill:hover{transform:translateY(-2px);animation:none;box-shadow:0 8px 28px rgba(255,107,53,.48)}
  @keyframes pulse{0%,100%{box-shadow:0 6px 28px rgba(255,107,53,.38)}50%{box-shadow:0 10px 40px rgba(255,107,53,.56)}}
  @media (max-width:768px){
    .lp-nav-inner{flex-wrap:wrap;height:auto !important;min-height:56px;padding:12px 0 !important;gap:8px !important}
    .lp-nav-right{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;justify-content:flex-end}
    .lp-nav-links{flex-wrap:wrap;gap:8px 12px !important}
    .lp-nav-links a{font-size:13px !important}
    .lp-nav{padding:0 16px !important}
    .lp-logo-header{height:38px !important}
  }
  @media (max-width:480px){
    .lp-logo-header{height:34px !important}
  }
`

export default function AppHeader({ onLogout, scrollY = 0 }: AppHeaderProps) {
  // ── Auth mode ──
  if (typeof onLogout === 'function') {
    return (
      <header className="w-full border-b border-[#ede9e2] bg-white px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="cursor-pointer">
            <img
              src="/images/branding/header_logo.svg"
              alt="NativeFlow"
              className="h-[44px] w-auto"
            />
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="cursor-pointer text-sm font-medium text-[#1a1a2e] transition hover:text-amber-600">
              マイページ
            </Link>
            <button type="button" onClick={onLogout} className="cursor-pointer text-sm font-medium text-amber-600 transition hover:text-amber-700">
              ログアウト
            </button>
          </div>
        </div>
      </header>
    )
  }

  // ── Public mode — exact top-page nav with self-contained CSS ──
  return (
    <>
      <style>{NAV_CSS}</style>
      <nav className="lp-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrollY > 20 ? 'rgba(255,255,255,.96)' : C.white,
        borderBottom: `1px solid ${scrollY > 20 ? C.border : 'transparent'}`,
        backdropFilter: scrollY > 20 ? 'blur(12px)' : 'none',
        transition: 'all .25s',
        padding: '0 40px',
      }}>
        <div className="lp-nav-inner" style={{ maxWidth: 1140, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/" className="lp-logo-wrap" style={{ display: 'flex', alignItems: 'center' }} aria-label="NativeFlow トップへ">
              <Image
                src="/images/branding/header_logo.svg"
                alt="NativeFlow"
                width={200} height={48}
                priority
                className="lp-logo-header"
                style={{ height: 48, width: 'auto' }}
              />
            </Link>
          </div>
          <div className="lp-nav-right" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <div className="lp-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
              <Link href="#features" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}><span>特長</span></Link>
              <Link href="#flow" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}><span>学習の流れ</span></Link>
              <Link href="#pricing" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}><span>料金</span></Link>
              <Link href="#faq" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}><span>よくある質問</span></Link>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer', padding: '8px 6px', display: 'inline-block' }}>ログイン</Link>
              <Link href="/signup" className="btn-fill" style={{ padding: '10px 28px', fontSize: 14, animation: 'none', boxShadow: '0 4px 16px rgba(255,107,53,.3)' }}>無料ではじめる</Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}

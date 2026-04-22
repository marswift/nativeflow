'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

type AppHeaderProps = {
  /** When provided, renders authenticated nav (マイページ + ログアウト). Otherwise renders the public top-page nav. */
  onLogout?: () => void
  /** Display-only — no interactive switching */
  currentLanguage?: string
  /** @deprecated No longer used. Kept for backward compatibility. */
  onChangeLanguage?: (lang: string) => void
  /** Current scroll position — controls blur/border on public mode. */
  scrollY?: number
  /** "simple" renders a minimal logo-only header (for login/signup pages). */
  variant?: 'default' | 'simple'
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
  .lp-mobile-overlay,.lp-mobile-panel{display:none}
  .btn-fill{display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#ff6b35,#f7c948);color:white;border-radius:12px;font-weight:900;font-size:15px;font-family:'Nunito',sans-serif;border:none;cursor:pointer;box-shadow:0 4px 18px rgba(255,107,53,.32);transition:all .18s;animation:pulse 2.4s ease-in-out infinite}
  .btn-fill:hover{transform:translateY(-2px);animation:none;box-shadow:0 8px 28px rgba(255,107,53,.48)}
  @keyframes pulse{0%,100%{box-shadow:0 6px 28px rgba(255,107,53,.38)}50%{box-shadow:0 10px 40px rgba(255,107,53,.56)}}
  .lp-hamburger{display:none}
  @media (max-width:1024px){
    .lp-nav-inner{height:56px !important;padding:0 !important}
    .lp-nav-right{display:none !important}
    .lp-hamburger{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:none;background:none;cursor:pointer;padding:0}
    .lp-nav{padding:0 16px !important}
    .lp-logo-header{height:36px !important}
    .lp-mobile-overlay{display:block;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1100;opacity:0;transition:opacity 0.25s ease;pointer-events:none}
    .lp-mobile-overlay.open{opacity:1;pointer-events:auto}
    .lp-mobile-panel{display:flex;position:fixed;top:0;right:0;bottom:0;width:85vw;max-width:320px;background:#fff;z-index:1200;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);padding:24px 24px 32px;flex-direction:column;gap:8px;box-shadow:-4px 0 20px rgba(0,0,0,0.1);overflow-y:auto;-webkit-overflow-scrolling:touch}
    .lp-mobile-panel.open{transform:translateX(0)}
    .lp-mobile-panel a{display:block;padding:14px 0;font-size:16px;font-weight:700;color:#1B2A4A;border-bottom:1px solid rgba(0,0,0,0.06)}
  }
`

export default function AppHeader({ onLogout, scrollY = 0, variant = 'default' }: AppHeaderProps) {
  const [mobileOpen,setMobileOpen]=useState(false)
  useEffect(()=>{if(mobileOpen){document.body.style.overflow='hidden'}else{document.body.style.overflow=''}return()=>{document.body.style.overflow=''}},[mobileOpen])

  // ── Simple mode (login/signup) — logo only, no fixed positioning ──
  if (variant === 'simple') {
    return (
      <header className="w-full border-b border-[#ede9e2] bg-white px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-center">
          <Link href="/">
            <img src="/images/branding/header_logo.svg" alt="NativeFlow" className="h-[44px] w-auto" />
          </Link>
        </div>
      </header>
    )
  }

  // ── Auth mode (dashboard / settings / lesson) ──
  if (typeof onLogout === 'function') {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 z-40 w-full border-b border-[#ede9e2] bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/images/branding/header_logo.svg"
                alt="NativeFlow"
                width={140}
                height={36}
                priority
                className="h-8 w-auto sm:h-9"
                style={{ objectFit: 'contain' }}
              />
            </Link>
            <div className="flex items-center gap-4 sm:gap-5">
              <Link
                href="/dashboard"
                className="text-[13px] font-semibold text-[#4a4a6a] transition hover:text-[#1a1a2e] sm:text-sm"
              >
                マイページ
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="text-[13px] font-semibold text-[#ff6b35] transition hover:text-[#e55a2b] sm:text-sm"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>
        {/* Spacer to offset fixed header height */}
        <div className="h-14" />
      </>
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
              <Link href="/#features" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}><span>特徴</span></Link>
              <Link href="/#flow" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}><span>学習の流れ</span></Link>
              <Link href="/#pricing" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}><span>料金</span></Link>
              <Link href="/#faq" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}><span>よくある質問</span></Link>
            </div>
            <div style={{ display: 'flex', gap: 44, alignItems: 'center' }}>
              <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer', padding: '8px 6px', display: 'inline-block' }}>ログイン</Link>
              <Link href="/signup" className="btn-fill" style={{ padding: '10px 28px', fontSize: 14, animation: 'none', boxShadow: '0 4px 16px rgba(255,107,53,.3)' }}>無料ではじめる</Link>
            </div>
          </div>
          {/* Hamburger — mobile only */}
          <button className="lp-hamburger" type="button" onClick={()=>setMobileOpen(true)} aria-label="メニュー">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke={C.dark} strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      </nav>
      {/* Mobile menu — mobile only */}
      <div className={`lp-mobile-overlay${mobileOpen?' open':''}`} onClick={()=>setMobileOpen(false)} />
      <div className={`lp-mobile-panel${mobileOpen?' open':''}`}>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
          <button type="button" onClick={()=>setMobileOpen(false)} style={{background:'none',border:'none',cursor:'pointer',padding:8}} aria-label="閉じる">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke={C.dark} strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
        <Link href="/#features" onClick={()=>setMobileOpen(false)}>特徴</Link>
        <Link href="/#flow" onClick={()=>setMobileOpen(false)}>学習の流れ</Link>
        <Link href="/#pricing" onClick={()=>setMobileOpen(false)}>料金</Link>
        <Link href="/#faq" onClick={()=>setMobileOpen(false)}>よくある質問</Link>
        <Link href="/login" onClick={()=>setMobileOpen(false)}>ログイン</Link>
        <div style={{marginTop:16}}>
          <Link href="/signup" onClick={()=>setMobileOpen(false)} className="btn-fill" style={{display:'block',textAlign:'center',padding:'14px 0',fontSize:15,animation:'none'}}>無料ではじめる</Link>
        </div>
        {/* Footer links in mobile menu */}
        <div style={{marginTop:24,paddingTop:16,borderTop:'1px solid rgba(0,0,0,0.06)'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#9CA3AF',marginBottom:8,letterSpacing:'0.05em'}}>サポート・法的情報</div>
          <Link href="/contact" onClick={()=>setMobileOpen(false)} style={{fontSize:13,padding:'10px 0',borderBottom:'none'}}>お問い合わせ</Link>
          <Link href="/legal/privacy" onClick={()=>setMobileOpen(false)} style={{fontSize:13,padding:'10px 0',borderBottom:'none'}}>プライバシーポリシー</Link>
          <Link href="/legal/terms" onClick={()=>setMobileOpen(false)} style={{fontSize:13,padding:'10px 0',borderBottom:'none'}}>利用規約</Link>
          <Link href="/legal/tokusho" onClick={()=>setMobileOpen(false)} style={{fontSize:13,padding:'10px 0',borderBottom:'none'}}>特定商取引法に基づく表記</Link>
          <Link href="/legal/company" onClick={()=>setMobileOpen(false)} style={{fontSize:13,padding:'10px 0',borderBottom:'none'}}>会社情報</Link>
        </div>
      </div>
    </>
  )
}

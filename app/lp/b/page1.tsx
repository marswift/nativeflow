'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  orange:      '#F97316',
  orangeHover: '#EA6C0A',
  orangeLight: '#FB923C',
  orangeSoft:  'rgba(249,115,22,0.10)',
  orangeBorder:'rgba(249,115,22,0.22)',
  navy:        '#1B2A4A',
  navyDeep:    '#111D33',
  white:       '#FFFFFF',
  offWhite:    '#FFFCF8',
  gray50:      '#F9FAFB',
  gray100:     '#F3F4F6',
  gray200:     '#E5E7EB',
  gray400:     '#9CA3AF',
  gray600:     '#6B7280',
  gray800:     '#374151',
  green:       '#16A34A',
  greenBg:     '#F0FDF4',
  greenBorder: '#BBF7D0',
  redBg:       '#FFF5F5',
  redBorder:   '#FECACA',
  red:         '#DC2626',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────
type LpEvent = 'hero_cta_view'|'cta_click'|'quick_test_click'|'scroll_50'|'signup_complete'

function track(event: LpEvent, props?: Record<string, string|number|boolean>) {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, properties: { ...props, variant: 'B' } }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* silent */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');

  @keyframes fu {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fu  { animation: fu 0.55s ease both; }
  .fu1 { animation-delay: .08s; }
  .fu2 { animation-delay: .16s; }
  .fu3 { animation-delay: .24s; }
  .fu4 { animation-delay: .32s; }

  @keyframes ctaPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.04); }
  }
  .cta-link {
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    animation: ctaPulse 4s ease-in-out infinite;
  }
  .cta-link:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 16px 40px rgba(249,115,22,0.55), 0 4px 12px rgba(249,115,22,0.24) !important;
    animation: none;
  }

  @keyframes heroAfterIn {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1.05); }
  }
  .hero-after-img {
    animation: heroAfterIn 0.8s ease both;
    animation-delay: 0.3s;
    transform: scale(1.05);
  }
  .proof-img {
    transition: transform 0.3s ease;
  }
  .proof-img:hover {
    transform: scale(1.03);
  }

  @keyframes scrollCtaIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .hero-grid {
    display: flex;
    flex-direction: column;
    gap: 40px;
  }
  .two-col-b {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  @media (min-width: 768px) {
    .hero-grid {
      display: grid;
      grid-template-columns: 40% 60%;
      gap: 48px;
      align-items: center;
    }
    .two-col-b {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .sec-pad-b {
      padding-top: 80px !important;
      padding-bottom: 80px !important;
    }
  }

  .modal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    animation: fu 0.3s ease both;
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// SpeedBar
// ─────────────────────────────────────────────────────────────────────────────
function SpeedBar() {
  const total = 10
  const filled = 8
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        fontSize: 32, fontWeight: 900, color: T.orange,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
      }}>
        +45%
      </span>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: 16, height: 7, borderRadius: 4,
            background: i < filled ? T.orange : T.gray200,
          }} />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI atoms
// ─────────────────────────────────────────────────────────────────────────────
function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: T.orangeSoft,
      border: `1px solid ${T.orangeBorder}`,
      padding: '6px 16px', borderRadius: 100,
      fontSize: 13, fontWeight: 700, color: T.orange,
      marginBottom: 20,
    }}>
      {children}
    </span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.white,
      borderRadius: 20,
      border: `1px solid ${T.gray200}`,
      padding: '28px 28px',
      boxShadow: '0 8px 28px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
      ...style,
    }}>
      {children}
    </div>
  )
}

// CTA ─────────────────────────────────────────────────────────────────────────
function PrimaryCTA({ location = 'inline', onClick }: { location?: string; onClick?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, margin: '8px 0' }}>
      <Link
        href="/signup"
        className="cta-link"
        onClick={() => { track('cta_click', { location }); onClick?.() }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', maxWidth: 480,
          background: T.orange,
          color: T.white,
          fontSize: 22, fontWeight: 800,
          padding: '24px 56px',
          borderRadius: 100,
          textDecoration: 'none',
          letterSpacing: '-0.01em',
          boxShadow: '0 16px 48px rgba(249,115,22,0.5), 0 4px 14px rgba(249,115,22,0.22)',
          minHeight: 72,
          fontFamily: "'Noto Sans JP', sans-serif",
        }}
      >
        無料で今すぐ話してみる
      </Link>
      <p style={{ fontSize: 13, color: T.gray400, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>✓ クレカ不要</span>
        <span>✓ 1分登録</span>
        <span>✓ いつでも解約</span>
      </p>
    </div>
  )
}

// Wrap ────────────────────────────────────────────────────────────────────────
function Sec({ bg = T.white, id, children }: { bg?: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="sec-pad-b" style={{ background: bg, padding: '80px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>{children}</div>
    </section>
  )
}

// ── Mock modal ────────────────────────────────────────────────────────────
function PhraseModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [recording, setRecording] = useState(false)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.white, borderRadius: 24, padding: '36px 32px',
          maxWidth: 380, width: '90%', textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        }}
      >
        <p style={{ fontSize: 14, color: T.gray600, marginBottom: 8 }}>このフレーズを話してみましょう</p>
        <p style={{ fontSize: 28, fontWeight: 800, color: T.navy, marginBottom: 28, lineHeight: 1.4 }}>
          &ldquo;Good morning!&rdquo;
        </p>
        <button
          type="button"
          onClick={() => {
            if (!recording) {
              setRecording(true)
              setTimeout(() => router.push('/signup'), 1200)
            }
          }}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: recording
              ? `linear-gradient(135deg, ${T.green}, #22C55E)`
              : `linear-gradient(135deg, ${T.orange}, ${T.orangeLight})`,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: recording
              ? '0 8px 24px rgba(22,163,74,0.4)'
              : '0 8px 24px rgba(249,115,22,0.4)',
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ fontSize: 28, color: T.white }}>
            {recording ? '✓' : '🎙'}
          </span>
        </button>
        <p style={{ fontSize: 13, color: T.gray600 }}>
          {recording ? '登録してフル機能を体験 →' : 'タップして話す'}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function LpPatternB() {
  const [showSticky,    setShowSticky]    = useState(false)
  const [scroll50Fired, setScroll50Fired] = useState(false)
  const [isTesting,     setIsTesting]     = useState(false)
  const [showFeedback,  setShowFeedback]  = useState(false)
  const [showModal,     setShowModal]     = useState(false)
  const [showScrollCta, setShowScrollCta] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => { track('hero_cta_view') }, [])

  const handleScroll = useCallback(() => {
    const y = window.scrollY
    const h = document.documentElement.scrollHeight - window.innerHeight
    setShowSticky(y > 400)
    if (!scroll50Fired && h > 0 && y / h >= 0.5) {
      setScroll50Fired(true)
      setShowScrollCta(true)
      track('scroll_50')
    }
  }, [scroll50Fired])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <>
      {/* ── Preload hero images ── */}
      <link rel="preload" as="image" href="/images/lp/hero/hero-before-1.jpg" />
      <link rel="preload" as="image" href="/images/lp/hero/hero-after-1.jpg" />

      {/* ── Global styles ── */}
      <style>{GLOBAL_CSS}</style>

      {/* ── Mock modal ── */}
      {showModal && <PhraseModal onClose={() => setShowModal(false)} />}

      <div style={{
        fontFamily: "'Noto Sans JP', sans-serif",
        fontSize: 18, fontWeight: 400, lineHeight: 1.75,
        overflowX: 'hidden', background: T.white, color: T.navy,
      }}>

        {/* ══ HEADER — matches AppHeader style, LP-lightweight ══ */}
        <header className="w-full border-b border-[#ede9e2] bg-white px-6 py-3">
          <div className="mx-auto flex max-w-[1100px] items-center justify-between">
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/branding/header_logo.png"
                alt="NativeFlow"
                width={140} height={44}
                className="h-[40px] w-auto"
              />
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition"
            >
              ログイン
            </Link>
          </div>
        </header>

        {/* ════════════════════════════════════════════════
            SECTION 1 · HERO
        ════════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          className="sec-pad-b"
          style={{
            background: 'linear-gradient(160deg,#FFFBF5 0%,#FFFFFF 65%)',
            padding: '80px 24px 88px',
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div className="hero-grid">

              {/* Left column — text (40%) */}
              <div>

                {/* H1 */}
                <h1 className="fu fu1" style={{
                  fontSize: 56,
                  fontWeight: 900, lineHeight: 1.15,
                  letterSpacing: '-0.025em',
                  color: T.navy, marginBottom: 24,
                }}>
                  3ヶ月後、英語で<br />
                  <span style={{ color: T.orange }}>雑談しているあなたへ。</span>
                </h1>

                <p className="fu fu2" style={{ fontSize: 17, lineHeight: 1.7, color: T.gray600, marginBottom: 32, maxWidth: 420 }}>
                  毎朝3分のAI会話で、次の会議で<br />「え、話せる!?」と言わせる。
                </p>

                {/* Social proof pill */}
                <div className="fu fu2" style={{
                  display: 'inline-block',
                  background: T.orangeSoft,
                  border: `1px solid ${T.orangeBorder}`,
                  borderRadius: 14, padding: '14px 22px',
                  marginBottom: 28,
                }}>
                  <p style={{ fontSize: 14, color: T.orange, fontWeight: 800, marginBottom: 4 }}>
                    93%が7日以内に初会話を達成
                  </p>
                  <p style={{ fontSize: 12, color: T.gray600 }}>※β版ユーザー調査</p>
                </div>

                {/* Main CTA */}
                <div className="fu fu3" style={{ marginTop: 8, marginBottom: 32 }}>
                  <PrimaryCTA location="hero" />
                </div>

                {/* Micro-interaction CTA */}
                <div className="fu fu4">
                  <button
                    type="button"
                    onClick={() => {
                      track('quick_test_click')
                      setShowModal(true)
                    }}
                    style={{
                      background: 'rgba(27,42,74,0.05)',
                      border: '1px solid rgba(27,42,74,0.1)',
                      color: T.gray600,
                      fontSize: 14, fontWeight: 600,
                      padding: '11px 24px', borderRadius: 100,
                      cursor: 'pointer', minHeight: 42,
                      fontFamily: "'Noto Sans JP', sans-serif",
                      transition: 'background 0.2s ease',
                    }}
                  >
                    ▶ 1フレーズ話してみる
                  </button>
                </div>
              </div>

              {/* Right column — visuals (60%) */}
              <div>
                {/* Hero before/after images */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                  marginBottom: 20,
                }}>
                  {/* Before */}
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', top: 12, left: 12, zIndex: 1,
                      background: 'rgba(0,0,0,0.5)', color: '#fff',
                      fontSize: 12, fontWeight: 700, padding: '4px 12px',
                      borderRadius: 100, backdropFilter: 'blur(4px)',
                    }}>Before</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/lp/hero/hero-before-1.jpg"
                      alt="英語に自信がない状態"
                      width={280} height={280}
                      fetchPriority="high" decoding="async"
                      style={{
                        width: '100%', height: 260, objectFit: 'cover',
                        borderRadius: 16, aspectRatio: '1/1',
                        filter: 'grayscale(100%)', opacity: 0.9,
                      }}
                    />
                  </div>
                  {/* After */}
                  <div style={{
                    position: 'relative', overflow: 'hidden', borderRadius: 16,
                    boxShadow: '0 0 40px rgba(255,180,80,0.25)',
                  }}>
                    <span style={{
                      position: 'absolute', top: 12, left: 12, zIndex: 1,
                      background: 'rgba(249,115,22,0.85)', color: '#fff',
                      fontSize: 12, fontWeight: 700, padding: '4px 12px',
                      borderRadius: 100,
                    }}>After</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/lp/hero/hero-after-1.jpg"
                      alt="自信を持って英語で会話する女性"
                      width={280} height={280}
                      className="hero-after-img"
                      fetchPriority="high" decoding="async"
                      style={{
                        width: '100%', height: 260, objectFit: 'cover',
                        aspectRatio: '1/1',
                      }}
                    />
                  </div>
                </div>

                {/* App UI preview */}
                <div style={{
                  borderRadius: 20, overflow: 'hidden',
                  border: `1px solid ${T.gray200}`,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)',
                }}>
                  <div style={{
                    background: T.navy, color: T.white,
                    padding: '13px 18px', fontSize: 13,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 700 }}>NativeFlow</span>
                    <span style={{ opacity: 0.6 }}>Morning Lesson</span>
                  </div>
                  <div style={{ background: T.white, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{
                      background: T.gray100, padding: '12px 16px',
                      borderRadius: '16px 16px 16px 4px',
                      fontSize: 14, maxWidth: '80%', color: T.gray800,
                    }}>
                      Good morning! What did you do yesterday?
                    </div>
                    <div style={{
                      background: T.orange, color: T.white,
                      padding: '12px 16px',
                      borderRadius: '16px 16px 4px 16px',
                      fontSize: 14, maxWidth: '80%', alignSelf: 'flex-end',
                    }}>
                      I went to Osaka with my friends.
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: T.green, fontWeight: 700, marginBottom: 6 }}>
                        ✓ Good (Score: 82)
                      </div>
                      <div style={{
                        height: 6, borderRadius: 3, background: T.gray200, overflow: 'hidden',
                      }}>
                        <div style={{
                          width: '82%', height: '100%', borderRadius: 3,
                          background: `linear-gradient(90deg, ${T.green}, #22C55E)`,
                        }} />
                      </div>
                    </div>
                  </div>
                </div>

                <p style={{ marginTop: 14, fontSize: 13, color: T.gray400, textAlign: 'center' }}>
                  音声 → AI評価 → すぐに会話
                </p>
                <p style={{ marginTop: 8, fontSize: 14, color: T.gray600, lineHeight: 1.65, textAlign: 'center' }}>
                  📱 スマホ1つで、通勤中や自宅でもすぐに英会話トレーニング
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            SECTION 2 · FUTURE EXPERIENCE
        ════════════════════════════════════════════════ */}
        <Sec bg={T.gray50}>
          <SectionBadge>✨ こんな未来が待っています</SectionBadge>
          <div className="two-col-b" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
            {[
              { icon: '🌍', text: '海外で自然に会話する' },
              { icon: '😄', text: 'ジョークで笑い合う' },
              { icon: '💼', text: '通訳なしで商談を進める' },
            ].map((item, i) => (
              <Card key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: T.navy }}>{item.text}</span>
                <span style={{ marginLeft: 'auto', color: T.green, fontWeight: 800, fontSize: 20 }}>✓</span>
              </Card>
            ))}
          </div>
          <div style={{
            background: T.navy, borderRadius: 16,
            padding: '22px 28px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: T.white, lineHeight: 1.5 }}>
              ――これが現実になります
            </p>
          </div>
        </Sec>

        {/* ════════════════════════════════════════════════
            SECTION 3 · GAP
        ════════════════════════════════════════════════ */}
        <Sec bg={T.white}>
          <div style={{
            background: `linear-gradient(160deg,#FFFBF5,${T.white})`,
            border: `1.5px solid ${T.orangeBorder}`,
            borderRadius: 24, padding: '44px 32px', textAlign: 'center',
            maxWidth: 680, margin: '0 auto',
          }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.35, marginBottom: 24, color: T.navy }}>
              単語はわかる。<br />
              でも口が動かない──
            </h2>
            <span style={{
              display: 'inline-block',
              background: T.orange, color: T.white,
              fontSize: 18, fontWeight: 900,
              padding: '12px 32px', borderRadius: 100,
              boxShadow: '0 6px 20px rgba(249,115,22,0.32)',
            }}>
              足りないのはここだけ。
            </span>
          </div>
        </Sec>

        {/* ════════════════════════════════════════════════
            SECTION 4 · MICRO EXPERIENCE
        ════════════════════════════════════════════════ */}
        <Sec bg={T.gray50}>
          <SectionBadge>💬 こんな練習ができます</SectionBadge>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <Card style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: T.gray600, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>AI：</p>
                <p style={{ fontSize: 18, fontWeight: 600, color: T.navy, lineHeight: 1.7 }}>
                  Where did you go last weekend?
                </p>
              </div>
              <div style={{ borderTop: `1px solid ${T.gray200}`, paddingTop: 16 }}>
                <p style={{ color: T.orange, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>あなた：</p>
                <p style={{ fontSize: 18, fontWeight: 600, color: T.navy, lineHeight: 1.7 }}>
                  I went to Osaka with my friends.
                </p>
              </div>
              <div style={{ marginTop: 14, fontSize: 13, color: T.green, fontWeight: 700 }}>
                ✓ Perfect! Natural and fluent.
              </div>
            </Card>
            <div style={{
              background: T.orangeSoft,
              border: `1px solid ${T.orangeBorder}`,
              borderRadius: 14, padding: '18px 20px',
              textAlign: 'center',
              fontSize: 18, fontWeight: 800, color: T.navy,
            }}>
              👉 これを毎朝3回くり返すだけ。
            </div>
          </div>
        </Sec>

        {/* ════════════════════════════════════════════════
            SECTION 5 · SOLUTION — full-width dark
        ════════════════════════════════════════════════ */}
        <section className="sec-pad-b" style={{
          background: `linear-gradient(145deg,${T.navy} 0%,#243566 100%)`,
          padding: '96px 24px', textAlign: 'center',
        }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ fontSize: 44, marginBottom: 24 }}>🎙️</div>
            <h2 style={{
              fontSize: 36,
              fontWeight: 900, lineHeight: 1.3, color: T.white,
            }}>
              NativeFlowは<br />
              <span style={{ color: '#FBA96A' }}>&quot;話す&quot;専用</span>の<br />
              AI英会話トレーニング。
            </h2>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            SECTION 6 · BENEFITS
        ════════════════════════════════════════════════ */}
        <Sec bg={T.gray50}>
          <SectionBadge>⚡ 3つの特長</SectionBadge>
          <div className="two-col-b" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52, minWidth: 52,
                background: T.orangeSoft, borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>😅</div>
              <p style={{ fontSize: 18, lineHeight: 1.65, color: T.navy }}>
                ミスしてもAIだから<strong style={{ color: T.orange }}>恥ゼロ</strong>
              </p>
            </Card>
            <Card>
              <p style={{ fontSize: 14, color: T.gray600, marginBottom: 12 }}>発話速度の平均上昇率（21日後）</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: T.navy, fontWeight: 600 }}>・発話速度</span>
                <SpeedBar />
                <span style={{ fontSize: 14, color: T.gray600 }}>（平均21日）</span>
              </div>
            </Card>
            <Card style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52, minWidth: 52,
                background: T.orangeSoft, borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>🎧</div>
              <p style={{ fontSize: 18, lineHeight: 1.65, color: T.navy }}>
                通勤中も「声」だけで練習
              </p>
            </Card>
          </div>
        </Sec>

        {/* ── Lifestyle image ── */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 40px', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/lp/lifestyle/lifestyle-home-1.jpg"
            alt="自宅でスマホを使って英会話レッスン"
            width={800} height={400}
            style={{
              width: '100%', maxWidth: 640, height: 'auto', objectFit: 'cover',
              borderRadius: 16,
            }}
          />
          <p style={{ fontSize: 14, color: T.gray600, marginTop: 12 }}>
            スマホ1つで、通勤中でも自宅でもすぐに英会話トレーニング
          </p>
        </div>

        {/* ════════════════════════════════════════════════
            SECTION 7 · BEFORE / AFTER
        ════════════════════════════════════════════════ */}
        <Sec bg={T.white}>
          <SectionBadge>🔄 こう変わる</SectionBadge>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
              <Card style={{
                padding: '24px 20px',
                background: T.redBg, border: `1px solid ${T.redBorder}`,
              }}>
                <p style={{ fontWeight: 800, marginBottom: 8, color: T.red, fontSize: 13 }}>Before</p>
                <p style={{ fontSize: 15, color: T.gray800, lineHeight: 1.65 }}>考えて止まる → 沈黙</p>
              </Card>
              <div style={{ color: T.orange, fontWeight: 900, fontSize: 22, textAlign: 'center' }}>→</div>
              <Card style={{
                padding: '24px 20px',
                background: T.greenBg, border: `1px solid ${T.greenBorder}`,
              }}>
                <p style={{ fontWeight: 800, marginBottom: 8, color: T.green, fontSize: 13 }}>After</p>
                <p style={{ fontSize: 15, color: T.navy, fontWeight: 700, lineHeight: 1.65 }}>考えずに口から出る</p>
              </Card>
            </div>
          </div>
        </Sec>

        {/* ════════════════════════════════════════════════
            SECTION 8 · HUMAN PROOF
        ════════════════════════════════════════════════ */}
        <Sec bg={T.gray50}>
          <SectionBadge>💬 ユーザーの声</SectionBadge>

          {/* Proof image gallery — horizontal scroll on mobile */}
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, marginBottom: 12,
            WebkitOverflowScrolling: 'touch',
          }}>
            {[
              { src: '/images/lp/proof/proof-1.png', alt: '英語で会話を楽しむ女性' },
              { src: '/images/lp/proof/proof-2.png', alt: '笑顔で会話する女性' },
              { src: '/images/lp/proof/proof-3.png', alt: 'カフェで英語を話す女性' },
              { src: '/images/lp/proof/proof-4.png', alt: '自信を持って英語を使う女性' },
            ].map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={img.src}
                alt={img.alt}
                className="proof-img"
                width={220} height={220}
                style={{
                  width: 220, height: 220, objectFit: 'cover',
                  borderRadius: 12, flexShrink: 0,
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 13, color: T.gray600, marginBottom: 24, textAlign: 'center' }}>
            実際に英語で会話できるようになったユーザーの一例
          </p>

          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <Card style={{ padding: '32px 32px', display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/lp/proof/proof-1.png"
                alt="笑顔で英語を話す女性"
                className="proof-img"
                width={200} height={200}
                style={{
                  width: 180, height: 180, objectFit: 'cover',
                  borderRadius: 16, flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ color: '#FBBF24', fontSize: 18 }}>★</span>
                  ))}
                </div>
                <blockquote style={{
                  fontSize: 18, lineHeight: 1.85,
                  fontStyle: 'italic', color: T.gray800,
                  borderLeft: `3px solid ${T.orange}`,
                  paddingLeft: 20, margin: '0 0 20px 0',
                }}>
                  「何年も話せなかったのに、3日目で英語で返せました」
                </blockquote>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/lp/avatar/avatar-user-1.jpg"
                    alt="ユーザー"
                    width={40} height={40}
                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%' }}
                  />
                  <p style={{ fontSize: 14, color: T.gray600 }}>― 32歳・営業</p>
                </div>
              </div>
            </Card>
          </div>
        </Sec>

        {/* ════════════════════════════════════════════════
            SECTION 9 · CHOICE TRIGGER
        ════════════════════════════════════════════════ */}
        <Sec bg={T.white}>
          <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{
              fontSize: 32, fontWeight: 700, lineHeight: 1.35,
              marginBottom: 32, color: T.navy,
            }}>
              1週間後、あなたは<br />どちらですか？
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                padding: '22px', borderRadius: 16,
                background: T.gray50, border: `1px solid ${T.gray200}`,
                fontSize: 16, color: T.gray400,
                textDecoration: 'line-through',
              }}>
                まだ話せないままの自分
              </div>
              <div style={{
                padding: '22px', borderRadius: 16,
                background: T.orange,
                border: `2px solid ${T.orange}`,
                fontSize: 20, fontWeight: 800, color: T.white,
                boxShadow: '0 8px 28px rgba(249,115,22,0.32)',
              }}>
                少し話せるようになった自分 ✨
              </div>
            </div>
          </div>
        </Sec>

        {/* ── Scene image ── */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/lp/scene/scene-cafe-1.jpg"
          alt=""
          width={1200} height={400}
          style={{
            width: '100%', height: 'auto', objectFit: 'cover',
            opacity: 0.9, display: 'block',
            borderRadius: 0,
          }}
        />

        {/* ════════════════════════════════════════════════
            SECTION 10 · ACTION TRIGGER
        ════════════════════════════════════════════════ */}
        <section className="sec-pad-b" style={{
          background: 'linear-gradient(160deg,#FFFBF5 0%,#FFFFFF 100%)',
          padding: '80px 24px',
        }}>
          <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
            <p style={{
              fontSize: 32,
              fontWeight: 900, lineHeight: 1.4, color: T.navy,
            }}>
              今この瞬間から、<br />
              <span style={{ color: T.orange }}>&quot;話せる側&quot;</span>に変わります。
            </p>

            {/* Scroll-triggered CTA */}
            {showScrollCta && (
              <div style={{
                marginTop: 32,
                animation: 'scrollCtaIn 0.3s ease both',
              }}>
                <PrimaryCTA location="scroll-trigger" />
              </div>
            )}
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            SECTION 11 · FINAL CTA
        ════════════════════════════════════════════════ */}
        <section className="sec-pad-b" style={{ background: T.navy, padding: '64px 24px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PrimaryCTA location="final" />
            <p style={{ marginTop: 28, fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" style={{ color: '#FBA96A', fontWeight: 700, textDecoration: 'underline' }}>
                ログイン
              </Link>
            </p>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            STICKY CTA
        ════════════════════════════════════════════════ */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${T.gray200}`,
          padding: '14px 24px',
          transform: showSticky ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <Link
            href="/signup"
            className="cta-link"
            onClick={() => track('cta_click', { location: 'sticky' })}
            style={{
              display: 'block', textAlign: 'center',
              background: T.orange, color: T.white,
              fontSize: 17, fontWeight: 800,
              padding: '16px 0', borderRadius: 100,
              textDecoration: 'none',
              minHeight: 52,
              maxWidth: 480, margin: '0 auto',
              boxShadow: '0 10px 28px rgba(249,115,22,0.45)',
              fontFamily: "'Noto Sans JP', sans-serif",
            }}
          >
            無料で今すぐ話してみる
          </Link>
        </div>

        {/* ══ FOOTER — matches AppFooter exactly ══ */}
        <footer className="border-t border-[#ede9e2] bg-white px-6 py-6">
          <div className="mx-auto flex max-w-[960px] flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-[#6b7280] sm:justify-start">
              <Link href="/contact" className="hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">
                お問い合わせ
              </Link>
              <Link href="/legal/privacy" className="hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">
                プライバシーポリシー
              </Link>
              <Link href="/legal/terms" className="hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">
                利用規約
              </Link>
              <Link href="/legal/tokusho" className="hover:text-[#1a1a2e] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded">
                特定商取引法に基づく表記
              </Link>
            </div>
            <p className="text-xs text-[#9ca3af]">© 2026 NativeFlow</p>
          </div>
        </footer>

        {/* Spacer for sticky */}
        <div style={{ height: showSticky ? 80 : 0, transition: 'height 0.3s ease' }} />
      </div>
    </>
  )
}

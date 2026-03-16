'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── constants ──────────────────────────────────────────────────────────────
const C = {
  orange: '#ff6b35',
  yellow: '#f7c948',
  dark: '#1a1a2e',
  mid: '#4a4a6a',
  light: '#f7f4ef',
  white: '#ffffff',
  border: '#ede9e2',
}

const CHAT = [
  { r: 'ai' as const, t: 'Good morning! Ready for a quick chat? ☀️', d: 300 },
  { r: 'user' as const, t: "Sure! I've been meaning to practice more lately.", d: 1800 },
  { r: 'ai' as const, t: "That's great to hear. How did your weekend go? Did you do anything fun?", d: 3200 },
  { r: 'user' as const, t: "It was really nice. I went to Kamakura with some friends and we visited the giant Buddha. The weather was perfect for it.", d: 5000 },
  { r: 'ai' as const, t: "Oh wow, the Great Buddha of Kamakura! That's one of my favorite spots. What did you think of it? 🗿", d: 6800 },
  { r: 'user' as const, t: "It was incredible. I'd seen photos before but standing there in person felt completely different. We also had some street food on the way back.", d: 8800 },
]

const SCENES = [
  { e: '🌅', l: 'Morning', ex: ['How did you sleep?', 'I slept really well, thanks!'] },
  { e: '🚃', l: 'Commute', ex: ['Is the train crowded today?', 'Pretty packed, as usual.'] },
  { e: '💼', l: 'Work', ex: ['Got any meetings today?', 'Yeah, one at 3. A bit nervous.'] },
  { e: '🍱', l: 'Lunch', ex: ['What are you having for lunch?', 'Ramen! My favorite.'] },
  { e: '🛒', l: 'Shopping', ex: ['Did you find what you needed?', 'Almost! Still need veggies.'] },
  { e: '🌙', l: 'Evening', ex: ['How was your day overall?', 'Tiring, but productive!'] },
]

const FEATURES = [
  { tab: 'AI会話', icon: '💬', title: 'AIとの会話練習', body: 'テストや暗記じゃない。毎日AIと英語で話すことで、話す練習を積み重ねられる。', bullets: ['24時間いつでも話せる', '即時フィードバック付き', '初心者から上級者まで'] },
  { tab: '復習', icon: '🧠', title: '忘れる直前に復習', body: '脳科学に基づく間隔反復学習で、一度覚えた表現を確実に定着。無駄な復習ゼロ。', bullets: ['記憶定着率が大幅アップ', '復習タイミングをAIが管理', '語彙が自然に増えていく'] },
  { tab: '最適化', icon: '🎯', title: 'あなただけのカリキュラム', body: '目標・レベル・生活スタイルを設定するだけ。AIが最適なレッスンプランを毎日生成。', bullets: ['目標から逆算した設計', 'レベルを自動で調整', '進捗グラフで成長が見える'] },
  { tab: '日常生活', icon: '📅', title: '日常シーンで「使う英語」を', body: '朝・通勤・ランチ・夜——あなたの1日に沿ったレッスン。試験英語ではなく実戦英語。', bullets: ['9つの生活シーン', '文脈ごと語彙が定着', '明日からすぐ使える'] },
]

const FAQ_ITEMS = [
  { q: 'NativeFlowはどんなサービスですか？', a: 'AIと会話しながら、日常で使う英語を身につける語学学習サービスです。毎日少しずつ話す習慣をつくることで、自然に英語が口から出るようになることを目指しています。' },
  { q: '英語初心者でも使えますか？', a: 'はい。レベルに合わせてレッスンが調整されます。まずは7日間無料でお試しいただけます。' },
  { q: '7日間無料のあとどうなりますか？', a: '無料期間終了後、ご選択いただいたプラン（月額または年額）の課金が開始されます。解約はいつでも可能です。' },
  { q: '年額プランと月額プランの違いは？', a: '月額は2,480円/月、年額は19,800円/年（月あたり1,650円）です。年額の方がお得で、まとめてお支払いいただくことで月あたりの料金を抑えられます。' },
  { q: 'いつでも解約できますか？', a: 'はい。解約はいつでも可能で、解約後も期間満了まではご利用いただけます。なお、無料期間終了後の課金分の返金はお受けしておりません。' },
]

// ── small components ───────────────────────────────────────────────────────
function AnimatedChat({ scrollContainerRef }: { scrollContainerRef?: React.RefObject<HTMLDivElement | null> }) {
  const [vis, setVis] = useState<number[]>([])
  const [typing, setTyping] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const setVisible = (i: number) => setVis((v) => (v.includes(i) ? v : [...v, i]))

  const run = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setVis([])
    setTyping(false)
    CHAT.forEach((m, i) => {
      if (m.r === 'ai' && i > 0) timers.current.push(setTimeout(() => setTyping(true), m.d - 600))
      timers.current.push(setTimeout(() => { setTyping(false); setVisible(i) }, m.d))
    })
    timers.current.push(setTimeout(run, 10000))
  }

  useEffect(() => { run(); return () => timers.current.forEach(clearTimeout) }, [])

  useEffect(() => {
    if (!scrollContainerRef?.current || vis.length === 0) return
    const el = scrollContainerRef.current
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [vis, scrollContainerRef])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {CHAT.map((m, i) => vis.includes(i) ? (
        <div key={i} className="lp-chat-msg" style={{ display: 'flex', justifyContent: m.r === 'user' ? 'flex-end' : 'flex-start', animation: 'pop .35s cubic-bezier(.34,1.56,.64,1)' }}>
          {m.r === 'ai' && <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${C.orange},${C.yellow})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginRight: 7, alignSelf: 'flex-end' }}>🤖</div>}
          <div style={{ background: m.r === 'ai' ? '#f3f4f6' : `linear-gradient(135deg,${C.orange},${C.yellow})`, color: m.r === 'ai' ? C.dark : 'white', borderRadius: m.r === 'ai' ? '4px 16px 16px 16px' : '16px 4px 16px 16px', padding: '9px 14px', fontSize: 13.5, fontWeight: 500, maxWidth: '78%', boxShadow: m.r === 'user' ? '0 2px 10px rgba(255,107,53,.22)' : 'none' }}>{m.t}</div>
        </div>
      ) : null)}
      {typing && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,${C.orange},${C.yellow})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🤖</div>
          <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: '#f3f4f6', borderRadius: '4px 16px 16px 16px' }}>
            {[0, 1, 2].map(j => <div key={j} style={{ width: 7, height: 7, borderRadius: '50%', background: '#bbb', animation: `bounce .7s ease-in-out ${j * 0.15}s infinite` }} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function LP() {
  const [scroll, setScroll] = useState(0)
  const [tab, setTab] = useState(0)
  const [scene, setScene] = useState(0)
  const [session, setSession] = useState<unknown>(null)
  const heroChatScrollRef = useRef<HTMLDivElement>(null)
  const demoChatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isActive = true
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (isActive) setSession(s ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (isActive) setSession(s ?? null)
    })
    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const h = () => setScroll(window.scrollY)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setScene(s => (s + 1) % SCENES.length), 2200)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTab(prev => (prev + 1) % FEATURES.length), 3000)
    return () => clearInterval(t)
  }, [])

  const isLoggedIn = session != null

  return (
    <div style={{ fontFamily: "'Nunito','Hiragino Sans',sans-serif", background: C.white, color: C.dark, overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes pop{from{opacity:0;transform:scale(.75) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes lpFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes pulse{0%,100%{box-shadow:0 6px 28px rgba(255,107,53,.38)}50%{box-shadow:0 10px 40px rgba(255,107,53,.56)}}
        a{text-decoration:none;color:inherit}
        section[id]{scroll-margin-top:96px}
        .lp-nav{position:sticky;z-index:300}
        .lp-nav-inner,.lp-nav-right,.lp-nav-links{position:relative;z-index:301}
        .lp-nav-links{display:flex;align-items:center;gap:32px}
        .lp-nav-menu-link{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 10px;position:relative;z-index:302;cursor:pointer !important;pointer-events:auto}
        .lp-nav-menu-link,.lp-nav-menu-link *,.lp-nav-links a{cursor:pointer !important}
        .btn-fill{display:inline-block;padding:13px 28px;background:linear-gradient(135deg,${C.orange},${C.yellow});color:white;border-radius:12px;font-weight:900;font-size:15px;font-family:'Nunito',sans-serif;border:none;cursor:pointer;box-shadow:0 4px 18px rgba(255,107,53,.32);transition:all .18s;animation:pulse 2.4s ease-in-out infinite}
        .btn-fill:hover{transform:translateY(-2px);animation:none;box-shadow:0 8px 28px rgba(255,107,53,.48)}
        .btn-ghost{display:inline-block;padding:12px 26px;border:2px solid ${C.orange};color:${C.orange};border-radius:12px;font-weight:800;font-size:15px;font-family:'Nunito',sans-serif;background:none;cursor:pointer;transition:all .18s}
        .btn-ghost:hover{background:${C.orange}0a;transform:translateY(-1px)}
        .card-hover{transition:all .22s ease}
        .card-hover:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,0.1)!important}
        .lp-logo-header{height:48px;width:auto;display:block;object-fit:contain}
        .lp-logo-wrap{display:inline-flex;align-items:center;background:transparent}
        .lp-logo-footer{height:42px;width:auto;display:block;object-fit:contain}
        .lp-hero-section{min-height:520px}
        .lp-chat-card{display:flex;flex-direction:column;min-height:0;height:440px}
        .lp-chat-area{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.2) transparent}
        .lp-chat-area::-webkit-scrollbar{width:6px}
        .lp-chat-area::-webkit-scrollbar-track{background:transparent}
        .lp-chat-area::-webkit-scrollbar-thumb{background:rgba(0,0,0,.18);border-radius:3px}
        .lp-chat-area::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.28)}
        .lp-demo-card{display:flex;flex-direction:column;min-height:0;height:380px}
        .lp-scenes-preview-card{min-height:300px}
        .lp-features-grid{min-height:400px}
        .lp-features-tab-panel{min-height:360px}
        .lp-features-tab-content{animation:lpFadeIn .28s ease}
        .lp-chat-msg{transition:opacity .22s ease,transform .22s ease}
        .lp-pricing-card{min-height:340px}
        .lp-cta-inner{min-height:260px}
        @media (max-width: 768px){
          .lp-hero-grid{grid-template-columns:1fr !important;padding:40px 16px 48px !important;gap:40px !important}
          .lp-hero h1{font-size:28px !important}
          .lp-nav-inner{flex-wrap:wrap;height:auto !important;min-height:56px;padding:12px 0 !important;gap:8px !important}
          .lp-nav-right{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;justify-content:flex-end}
          .lp-nav-links{flex-wrap:wrap;gap:8px 12px !important}
          .lp-nav-links a{font-size:13px !important}
          .lp-nav{padding:0 16px !important}
          .lp-section{padding:48px 16px !important}
          .lp-section-sm{padding:40px 16px !important}
          .lp-pain-grid{grid-template-columns:1fr !important;gap:16px !important}
          .lp-pain h2,.lp-demo h2,.lp-scenes h2,.lp-features h2,.lp-pricing h2,.lp-faq h2,.lp-cta h2{font-size:26px !important}
          .lp-scenes-grid{grid-template-columns:1fr !important;gap:40px !important}
          .lp-features-grid{grid-template-columns:1fr !important;gap:32px !important;padding:24px 20px !important}
          .lp-pricing-grid{grid-template-columns:1fr !important;gap:20px !important}
          .lp-footer-grid{grid-template-columns:1fr 1fr !important;gap:24px !important}
          .lp-footer-bottom{flex-direction:column;gap:12px;text-align:center !important}
          .lp-cta h2{font-size:28px !important}
          .lp-logo-header{height:38px !important}
          .lp-logo-footer{height:36px !important}
          .lp-hero-section{min-height:380px !important}
          .lp-chat-card{height:360px !important}
          .lp-chat-area{height:auto !important}
          .lp-demo-card{height:320px !important}
          .lp-scenes-preview-card{min-height:260px !important}
          .lp-features-grid{min-height:340px !important}
          .lp-features-tab-panel{min-height:300px !important}
          .lp-pricing-card{min-height:300px !important}
          .lp-cta-inner{min-height:220px !important}
        }
        @media (max-width: 480px){
          .lp-logo-header{height:34px !important}
          .lp-footer-grid{grid-template-columns:1fr !important}
          .lp-chat-card{height:320px !important}
          .lp-demo-card{height:280px !important}
        }
      `}</style>

      {/* ════ NAV ════════════════════════════════════════════════════ */}
      <nav className="lp-nav" style={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: scroll > 20 ? 'rgba(255,255,255,.96)' : C.white,
        borderBottom: `1px solid ${scroll > 20 ? C.border : 'transparent'}`,
        backdropFilter: scroll > 20 ? 'blur(12px)' : 'none',
        transition: 'all .25s',
        padding: '0 40px',
      }}>
        <div className="lp-nav-inner" style={{ maxWidth: 1140, margin: '0 auto', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href={isLoggedIn ? '/dashboard' : '/'} className="lp-logo-wrap" style={{ display: 'flex', alignItems: 'center' }} aria-label={isLoggedIn ? 'レッスンホームへ' : 'NativeFlow トップへ'}>
              <Image
                src="/header_logo.svg"
                alt="NativeFlow"
                width={200}
                height={48}
                priority
                className="lp-logo-header"
                style={{ height: 48, width: "auto" }}
              />
            </Link>
          </div>
          <div className="lp-nav-right" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <div className="lp-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
              <Link href="#features" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}>
                <span>特徴</span>
              </Link>
              <Link href="#scenes" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}>
                <span>学習方法</span>
              </Link>
              <Link href="#pricing" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}>
                <span>料金</span>
              </Link>
              <Link href="#faq" className="lp-nav-menu-link" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer' }}>
                <span>よくある質問</span>
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: C.mid, transition: 'color .15s', cursor: 'pointer', padding: '8px 6px', display: 'inline-block' }}>ログイン</Link>
              <Link href="/signup" className="btn-fill" style={{ padding: '10px 28px', fontSize: 14, animation: 'none', boxShadow: `0 4px 16px rgba(255,107,53,.3)` }}>無料ではじめる</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ════ HERO ════════════════════════════════════════════════════ */}
      <section className="lp-hero-section" style={{ background: `linear-gradient(160deg, ${C.white} 55%, #fff8f2 100%)`, borderBottom: `1px solid ${C.border}` }}>
        <div className="lp-hero-grid" style={{ maxWidth: 1140, margin: '0 auto', padding: '72px 40px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
          <div className="lp-hero" style={{ animation: 'fadeUp .6s ease both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.orange}12`, border: `1.5px solid ${C.orange}28`, borderRadius: 20, padding: '6px 14px', marginBottom: 22 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.orange, letterSpacing: '.5px' }}>🎯 NativeFlowで話せる英語を</span>
            </div>
            <h1 style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 22 }}>
              AIと話すだけで、<br />
              <span style={{ background: `linear-gradient(135deg,${C.orange} 20%,${C.yellow})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', whiteSpace: 'nowrap' }}>英語が口から出てくる。</span>
            </h1>
            <p style={{ fontSize: 17, color: C.mid, lineHeight: 1.8, marginBottom: 32, maxWidth: 440 }}>
              単語帳でも文法書でもない。<br />
              毎日AIと会話するだけで、<strong style={{ color: C.dark }}>使える英語</strong>が自然と身につく学習方法。音声会話と読み・書きの練習の両方に対応しています。
            </p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
              <Link href="/signup" className="btn-fill" style={{ fontSize: 17, padding: '18px 44px' }}>無料ではじめる</Link>
            </div>
            <p style={{ fontSize: 14, color: C.mid, fontWeight: 600 }}>
              まずは7日間無料でお試しください。
            </p>
          </div>

          <div style={{ animation: 'fadeUp .6s .15s ease both', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 220, height: 220, borderRadius: '50%', background: `${C.orange}0c`, zIndex: 0 }} />
            <div style={{ position: 'absolute', bottom: -20, left: -20, width: 140, height: 140, borderRadius: '50%', background: `${C.yellow}14`, zIndex: 0 }} />

            <div
              className="lp-chat-card"
              style={{
                position: 'relative', zIndex: 1,
                background: C.white, borderRadius: 24, padding: '24px',
                boxShadow: '0 20px 60px rgba(0,0,0,.10)', border: `1.5px solid ${C.border}`,
                animation: 'float 4s ease-in-out infinite',
              }}
            >
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottom: `1px solid ${C.border}`, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${C.orange},${C.yellow})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>AI Tutor</div>
                  <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>● オンライン • 予約不要</div>
                </div>
                <div style={{ marginLeft: 'auto', background: `${C.orange}12`, color: C.orange, fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${C.orange}22` }}>Morning Chat ☀️</div>
              </div>
              <div className="lp-chat-area" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }} ref={heroChatScrollRef}>
                <AnimatedChat scrollContainerRef={heroChatScrollRef} />
              </div>
              <div style={{ flexShrink: 0, marginTop: 14, padding: '10px 14px', background: C.light, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#888' }}>英語で返信してみよう...</span>
                <div style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${C.orange},${C.yellow})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>↑</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════ PAIN → SOLUTION ════════════════════════════════════════ */}
      <section className="lp-section lp-pain" style={{ padding: '80px 40px', background: C.light }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: `${C.orange}12`, color: C.orange, fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${C.orange}28`, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 14 }}>😓 よくある悩み</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.25, letterSpacing: '-.5px' }}>
              英語、ずっと勉強してるのに<br />
              <span style={{ color: C.orange }}>なぜか話せない</span>と感じていませんか？
            </h2>
          </div>

          <div className="lp-pain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginBottom: 48 }}>
            {[
              { icon: '📚', title: '勉強しても会話で出てこない', body: '単語も文法も頭に入ってる。でも話そうとすると言葉が出てこない——典型的な「インプット勉強」の罠。' },
              { icon: '💸', title: '英会話教室は高いし続かない', body: '月2〜3万円、週1回のレッスン。通えない週が続き、気づいたら辞めていた——そんな経験ありませんか？' },
              { icon: '😰', title: '人前で話すのが怖い', body: '間違えたら恥ずかしい。だから話す練習ができない。そのせいでいつまでも話せないまま。' },
            ].map((p, i) => (
              <div key={i} className="card-hover" style={{ background: C.white, borderRadius: 20, padding: '28px 24px', boxShadow: '0 2px 16px rgba(0,0,0,.05)', border: `1.5px solid ${C.border}` }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: '#fee8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>{p.icon}</div>
                <h3 style={{ fontWeight: 800, fontSize: 17, marginBottom: 10 }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: C.mid, lineHeight: 1.75 }}>{p.body}</p>
              </div>
            ))}
          </div>

          <div style={{ background: `linear-gradient(135deg,${C.orange}0c,${C.yellow}0c)`, border: `2px solid ${C.orange}20`, borderRadius: 24, padding: '32px 40px', textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
            <div style={{ fontSize: 36, marginBottom: 5 }}>💡</div>
            <p style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.6 }}>
              それ全部、<span style={{ color: C.orange }}>「話す練習が足りない」</span><br />
              というのが1番の原因です。
            </p>
            <p style={{ fontSize: 15, color: C.mid, marginTop: 12, lineHeight: 1.7 }}>
              NativeFlowなら、AIが24時間あなたの会話相手になります。<br />失敗を恐れず、毎日気軽に話す練習ができます。
            </p>
          </div>
        </div>
      </section>

      {/* ════ DEMO ════════════════════════════════════════════════════ */}
      <section id="demo" className="lp-section lp-demo" style={{ padding: '80px 40px', background: C.white, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 12 }}>こんなふうに話せるようになる</h2>
          <p style={{ fontSize: 16, color: C.mid, marginBottom: 32 }}>AIとの会話デモ</p>
          <div className="lp-demo-card" style={{ maxWidth: 420, margin: '0 auto', background: C.white, borderRadius: 24, padding: 28, boxShadow: '0 12px 48px rgba(0,0,0,.09)', border: `1.5px solid ${C.border}` }}>
            <div className="lp-chat-area" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }} ref={demoChatScrollRef}>
              <AnimatedChat scrollContainerRef={demoChatScrollRef} />
            </div>
          </div>
        </div>
      </section>

      {/* ════ DAILY SCENES ═══════════════════════════════════════════ */}
      <section id="scenes" className="lp-section lp-scenes" style={{ padding: '80px 40px', background: C.light, borderTop: `1px solid ${C.border}` }}>
        <div className="lp-scenes-grid" style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', background: `${C.yellow}20`, color: '#b45309', fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${C.yellow}50`, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 18 }}>📅 生活シーン学習</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.25, letterSpacing: '-.5px', marginBottom: 18 }}>
              朝から夜まで、<br />
              <span style={{ color: C.orange }}>日常生活が教材</span>になる
            </h2>
            <p style={{ fontSize: 16, color: C.mid, lineHeight: 1.8, marginBottom: 28 }}>
              試験のための英語ではなく、実際に使う場面の英語を学ぶ。だから話せるようになる。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {SCENES.map((s, i) => (
                <div
                  key={i}
                  onClick={() => setScene(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 14, cursor: 'pointer',
                    background: scene === i ? `${C.orange}0e` : 'transparent',
                    border: `1.5px solid ${scene === i ? C.orange + '30' : 'transparent'}`,
                    transition: 'all .2s',
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: scene === i ? `linear-gradient(135deg,${C.orange},${C.yellow})` : C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, transition: 'all .2s', boxShadow: scene === i ? `0 4px 14px rgba(255,107,53,.3)` : 'none' }}>{s.e}</div>
                  <span style={{ fontWeight: scene === i ? 800 : 600, fontSize: 15, color: scene === i ? C.dark : C.mid }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="lp-scenes-preview-card" style={{ background: C.white, borderRadius: 24, padding: 28, boxShadow: '0 12px 48px rgba(0,0,0,.09)', border: `1.5px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${C.orange},${C.yellow})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{SCENES[scene].e}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{SCENES[scene].l} Scene</div>
                  <div style={{ fontSize: 12, color: '#888' }}>今日のレッスン • 5分</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fadeUp .3s ease' }}>
                {[
                  { r: 'ai' as const, t: SCENES[scene].ex[0] },
                  { r: 'user' as const, t: SCENES[scene].ex[1] },
                  { r: 'ai' as const, t: 'Great! Let me ask you something else...' },
                ].map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.r === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ background: m.r === 'ai' ? '#f3f4f6' : `linear-gradient(135deg,${C.orange},${C.yellow})`, color: m.r === 'ai' ? C.dark : 'white', borderRadius: m.r === 'ai' ? '4px 16px 16px 16px' : '16px 4px 16px 16px', padding: '10px 15px', fontSize: 14, fontWeight: 500, maxWidth: '82%' }}>{m.t}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {["That's cool!", "I see.", "Tell me more!"].map(p => (
                  <div key={p} style={{ background: C.light, borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 700, color: C.mid, border: `1.5px solid ${C.border}`, transition: 'all .15s' }}>{p}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════ FEATURES TABS ═══════════════════════════════════════════ */}
      <section id="features" className="lp-section lp-features" style={{ padding: '80px 40px', background: C.white, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', background: `${C.orange}12`, color: C.orange, fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${C.orange}28`, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 14 }}>⚡ 機能</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-.5px' }}>なぜNativeFlowだと話せるようになるのか</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 36, flexWrap: 'wrap' }}>
            {FEATURES.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTab(i)}
                style={{
                  padding: '10px 22px', borderRadius: 25,
                  background: tab === i ? `linear-gradient(135deg,${C.orange},${C.yellow})` : C.white,
                  color: tab === i ? 'white' : C.mid,
                  border: `1.5px solid ${tab === i ? 'transparent' : C.border}`,
                  fontWeight: 800, fontSize: 14, cursor: 'pointer',
                  fontFamily: "'Nunito',sans-serif",
                  boxShadow: tab === i ? `0 4px 16px rgba(255,107,53,.3)` : 'none',
                  transition: 'all .18s',
                }}
              >{f.tab}</button>
            ))}
          </div>
          <div className="lp-features-grid" style={{ background: C.light, borderRadius: 24, padding: '40px 48px', boxShadow: '0 4px 28px rgba(0,0,0,.07)', border: `1.5px solid ${C.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', animation: 'fadeUp .3s ease' }}>
            <div>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: `linear-gradient(135deg,${C.orange}20,${C.yellow}20)`, border: `1.5px solid ${C.orange}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>{FEATURES[tab].icon}</div>
              <h3 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.3, marginBottom: 14, letterSpacing: '-.3px' }}>{FEATURES[tab].title}</h3>
              <p style={{ fontSize: 16, color: C.mid, lineHeight: 1.8, marginBottom: 22 }}>{FEATURES[tab].body}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {FEATURES[tab].bullets.map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: `linear-gradient(135deg,${C.orange},${C.yellow})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontWeight: 900, flexShrink: 0 }}>✓</div>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-features-tab-panel" style={{ background: C.white, borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center', border: `1.5px solid ${C.border}` }}>
              <div key={tab} className="lp-features-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tab === 0 && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 13, color: C.orange, marginBottom: 4 }}>💬 今日の会話セッション</div>
                  {[{ r: 'ai' as const, t: "What's your biggest challenge at work?" }, { r: 'user' as const, t: 'Probably communicating in meetings.' }, { r: 'ai' as const, t: "Let's practice that! Imagine you're in a meeting..." }].map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.r === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{ background: m.r === 'ai' ? C.light : `linear-gradient(135deg,${C.orange},${C.yellow})`, color: m.r === 'ai' ? C.dark : 'white', borderRadius: m.r === 'ai' ? '4px 14px 14px 14px' : '14px 4px 14px 14px', padding: '9px 14px', fontSize: 13, fontWeight: 500, maxWidth: '85%', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>{m.t}</div>
                    </div>
                  ))}
                </>
              )}
              {tab === 1 && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 13, color: C.orange, marginBottom: 4 }}>🧠 今日の復習スケジュール</div>
                  {[['Today', 'be nervous about ~', '5回目'], ['Tomorrow', 'I appreciate that', '4回目'], ['In 3 days', 'That makes sense', '3回目'], ['Next week', 'Could you elaborate?', '2回目']].map(([when, phrase, count], i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.light, borderRadius: 12, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: i === 0 ? `linear-gradient(135deg,${C.orange},${C.yellow})` : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: i === 0 ? 'white' : '#999' }}>{(when as string).split(' ')[0]}</div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{phrase}</span>
                      <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>{count}</span>
                    </div>
                  ))}
                </>
              )}
              {tab === 2 && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 13, color: C.orange, marginBottom: 4 }}>🎯 あなたの学習プラン</div>
                  {[['目標', '海外出張で話せる英語'], ['レベル', '中級（B1）'], ['期限', '3ヶ月後'], ['1日', '15分'], ['今日のタスク', '仕事英語 × 2レッスン']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.light, borderRadius: 12, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                      <span style={{ fontSize: 13, color: '#888', fontWeight: 700 }}>{k}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.dark }}>{v}</span>
                    </div>
                  ))}
                </>
              )}
              {tab === 3 && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 13, color: C.orange, marginBottom: 4 }}>📅 今週の学習シーン</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {SCENES.map((s, i) => (
                      <div key={i} style={{ background: C.light, borderRadius: 14, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.05)', border: `1.5px solid ${i < 4 ? C.orange + '30' : 'transparent'}` }}>
                        <div style={{ fontSize: 24, marginBottom: 5 }}>{s.e}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: i < 4 ? C.orange : C.mid }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════ PRICING ═══════════════════════════════════════════════════ */}
      <section id="pricing" className="lp-section lp-pricing" style={{ padding: '80px 40px', background: C.light, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', background: `${C.yellow}20`, color: '#b45309', fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${C.yellow}50`, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 14 }}>💰 料金</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-.5px' }}>シンプルな料金（税込）</h2>
            <p style={{ fontSize: 16, color: C.mid, marginTop: 12 }}>7日間無料でお試しください。無料期間終了後に課金が開始されます。解約はいつでも可能です。</p>
          </div>
          <div className="lp-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 24, maxWidth: 720, margin: '0 auto', alignItems: 'stretch' }}>
            <div className="card-hover lp-pricing-card" style={{ position: 'relative', background: C.white, borderRadius: 24, padding: '36px 32px', boxShadow: '0 8px 32px rgba(255,107,53,.12)', border: `2px solid ${C.orange}`, borderTop: `4px solid ${C.orange}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'absolute', top: -12, left: 24, background: `linear-gradient(135deg,${C.orange},${C.yellow})`, color: 'white', fontSize: 12, fontWeight: 800, padding: '4px 14px', borderRadius: 20 }}>おすすめ</div>
              <h3 style={{ fontSize: 22, fontWeight: 900, marginTop: 8, marginBottom: 8 }}>年額プラン</h3>
              <p style={{ fontSize: 32, fontWeight: 900, color: C.dark, marginBottom: 4 }}>19,800円<span style={{ fontSize: 16, fontWeight: 700, color: C.mid }}>/年</span></p>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.orange, marginBottom: 20 }}>月あたり 1,650円</p>
              <p style={{ fontSize: 13, color: C.mid, marginBottom: 24 }}>月額プランより約33%お得</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  <span style={{ color: C.orange }}>✓</span> 7日間無料トライアル
                </li>
              </ul>
              <Link href="/signup?plan=yearly" className="btn-fill" style={{ display: 'block', textAlign: 'center', marginTop: 'auto', padding: '14px 24px', fontSize: 16 }} onClick={() => { if (process.env.NODE_ENV === 'development') console.log('[top page] selected plan', 'yearly') }}>7日間無料ではじめる</Link>
            </div>
            <div className="card-hover lp-pricing-card" style={{ background: C.white, borderRadius: 24, padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,.06)', border: `1.5px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>月額プラン</h3>
              <p style={{ fontSize: 32, fontWeight: 900, color: C.dark, marginBottom: 4 }}>2,480円<span style={{ fontSize: 16, fontWeight: 700, color: C.mid }}>/月</span></p>
              <p style={{ fontSize: 13, color: C.mid, marginBottom: 24 }}>月ごとのお支払い</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  <span style={{ color: C.orange }}>✓</span> 7日間無料トライアル
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  <span style={{ color: C.orange }}>✓</span> いつでも解約可能
                </li>
              </ul>
              <Link href="/signup?plan=monthly" className="btn-ghost" style={{ display: 'block', textAlign: 'center', marginTop: 'auto', padding: '14px 24px', fontSize: 16 }} onClick={() => { if (process.env.NODE_ENV === 'development') console.log('[top page] selected plan', 'monthly') }}>7日間無料ではじめる</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════ FAQ ════════════════════════════════════════════════════ */}
      <section id="faq" className="lp-section lp-faq" style={{ padding: '80px 40px', background: C.white, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-block', background: `${C.orange}12`, color: C.orange, fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${C.orange}28`, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 14 }}>❓ よくある質問</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-.5px' }}>質問と回答</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="card-hover" style={{ background: C.light, borderRadius: 20, padding: '24px 28px', border: `1.5px solid ${C.border}` }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: C.dark }}>{item.q}</h3>
                <p style={{ fontSize: 15, color: C.mid, lineHeight: 1.75 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ FINAL CTA ═══════════════════════════════════════════════ */}
      <section className="lp-section lp-cta" style={{ padding: '80px 40px', background: C.dark }}>
        <div className="lp-cta-inner" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.18, letterSpacing: '-1px', marginBottom: 16, color: 'white' }}>
            今日の5分が、<br />
            <span style={{ background: `linear-gradient(135deg,${C.orange},${C.yellow})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>半年後の自分を変える。</span>
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.7)', lineHeight: 1.8, marginBottom: 36 }}>
            まずは無料でAIと話してみてください。
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn-fill" style={{ fontSize: 17, padding: '16px 40px' }}>無料ではじめる</Link>
          </div>
          <p style={{ marginTop: 20, fontSize: 14, color: 'rgba(255,255,255,.5)' }}>
            すでにアカウントをお持ちの方は <Link href="/login" style={{ color: C.yellow, fontWeight: 800 }}>ログイン</Link>
          </p>
        </div>
      </section>

      {/* ════ FOOTER ══════════════════════════════════════════════════ */}
      <footer className="lp-footer" style={{ borderTop: `1px solid ${C.border}`, padding: '40px', background: C.white }}>
        <div className="lp-footer-grid" style={{ maxWidth: 1140, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Link href={isLoggedIn ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center' }}>
                <Image
                  src="/footer_logo.svg"
                  alt="NativeFlow"
                  width={200}
                  height={40}
                  className="lp-logo-footer"
                  style={{ height: 40, width: "auto" }}
                />
              </Link>
            </div>
            <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.7, maxWidth: 240 }}>Speak with AI. Learn like a native.</p>
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
        <div className="lp-footer-bottom" style={{ maxWidth: 1140, margin: '28px auto 0', paddingTop: 24, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 13, color: '#bbb' }}>© 2026 NativeFlow. All rights reserved.</p>
          <p style={{ fontSize: 12, color: '#bbb' }}>Speak with AI. Learn like a native.</p>
        </div>
      </footer>
    </div>
  )
}

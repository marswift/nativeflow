'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import AppHeader from '@/components/header/app-header'
import AppFooter, { LP_FOOTER_CSS } from '@/components/footer/app-footer'

// ── Analytics ─────────────────────────────────────────────────────────────
type LpEvent = 'hero_cta_view'|'cta_click'|'scroll_50'|'signup_complete'
function track(e: LpEvent, p?: Record<string,string|number|boolean>) {
  try { fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:e,properties:{...p,variant:'B'}}),keepalive:true}).catch(()=>{}) } catch{}
}

// ── CTA ───────────────────────────────────────────────────────────────────
function CTA({ label='無料ではじめる', loc='inline', large=false, compact=false }:{label?:string;loc?:string;large?:boolean;compact?:boolean}) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
      {!compact&&<p style={{fontSize:14,fontWeight:600,color:'#1B2A4A',opacity:0.7,textAlign:'center',marginBottom:20}}>3ヶ月後の自分を変えるなら、今です。</p>}
      <Link href="/signup" className="lp-cta-btn" onClick={()=>track('cta_click',{location:loc})} style={{
        display:'flex',alignItems:'center',justifyContent:'center',
        background:'linear-gradient(135deg,#F97316 0%,#FB923C 100%)',
        color:'#fff',fontFamily:"'Hiragino Sans','Noto Sans JP',sans-serif",
        fontSize:large?18:16,fontWeight:800,
        padding:large?'18px 44px':'15px 36px',
        borderRadius:100,textDecoration:'none',width:'100%',maxWidth:340,
        boxShadow:'0 8px 24px rgba(249,115,22,0.38)',minHeight:52,
        letterSpacing:'-0.01em',
      }}>{label} <span style={{display:'inline-flex',alignItems:'center',marginLeft:6}} aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 12H21M21 12L15 6M21 12L15 18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span></Link>
      <div style={{display:'flex',gap:14,fontSize:12,color:'#9CA3AF',flexWrap:'wrap',justifyContent:'center'}}>
        <span>✓ すぐ始められる</span><span>✓ 7日間無料</span><span>✓ いつでも解約</span>
      </div>
    </div>
  )
}

function Sec({bg='#fff',children,id}:{bg?:string;children:React.ReactNode;id?:string}) {
  return <section id={id} className="lp-sec" style={{background:bg,padding:'64px 22px'}}><div style={{maxWidth:820,margin:'0 auto'}}>{children}</div></section>
}

function Badge({children}:{children:React.ReactNode}) {
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(249,115,22,0.1)',border:'1px solid rgba(249,115,22,0.22)',padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:700,color:'#F97316',marginBottom:14}}>{children}</span>
}

const ICON_MAP: Record<string,string> = {'🎧':'listen','🤖':'ai','🎯':'target','💬':'conversation','🤝':'smooth','🆓':'free','🌱':'beginner-wakaba','⏱️':'clock','🎙️':'speak','🎙':'speak','🧠':'memory','🎤':'speak','✨':'memory','📊':'report','🛡️':'safe','🗣':'speak','🗣️':'speak','🏠':'daily-life'}
function LpIcon({emoji,size=32}:{emoji:string;size?:number}) {
  if (emoji==='💎') return <Image src="/images/branding/diamond.svg" alt="" width={size*2} height={size*2} style={{width:size,height:size,objectFit:'contain'}} />
  const file = ICON_MAP[emoji]
  if (!file) return <span style={{fontSize:size}}>{emoji}</span>
  return <Image src={`/images/lp/icons/${file}.webp`} alt="" width={size*2} height={size*2} style={{width:size,height:size,objectFit:'contain'}} />
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function LpB() {
  const [_sticky,setSticky]=useState(false)
  const [fired,setFired]=useState(false)
  const [scrollY,setScrollY]=useState(0)
  const [demoStep,setDemoStep]=useState(0)
  const TESTIMONIALS=[
    {img:'/images/lp/proof/proof-1.jpg',name:'中村 さん',attr:'26歳・会社員',stars:5,quote:'ずっと話せなかったのに3日で変化を感じました。毎日5分でも全然違います。'},
    {img:'/images/lp/proof/proof-2.jpg',name:'佐藤 さん',attr:'31歳・マーケター',stars:5,quote:'英会話スクールは続かなかった私でも毎日続けられています。スキマ時間でできるのが大きいです。'},
    {img:'/images/lp/proof/proof-3.jpg',name:'木村 さん',attr:'38歳・営業マネージャー',stars:5,quote:'海外クライアントとの会議が怖くなくなりました。自然に言葉が出てくるようになって驚いています。'},
    {img:'/images/lp/proof/proof-4.jpg',name:'田中 さん',attr:'29歳・エンジニア',stars:5,quote:'通勤時間だけで練習できるのが最高。3週間で海外の同僚と雑談できるようになりました。'},
    {img:'/images/lp/proof/proof-5.jpg',name:'山本 さん',attr:'34歳・デザイナー',stars:5,quote:'他のアプリと全然違う。話す練習に集中できるから、本当に口から出てくるようになった。'},
    {img:'/images/lp/proof/proof-6.jpg',name:'鈴木 さん',attr:'27歳・看護師',stars:5,quote:'海外旅行で初めて現地の人と会話できました。あの感動は忘れられません。'},
    {img:'/images/lp/proof/proof-7.jpg',name:'高橋 さん',attr:'33歳・コンサルタント',stars:5,quote:'プレゼンで英語が自然に出てきた時、自分でも驚きました。自信がつきました。'},
    {img:'/images/lp/proof/proof-8.jpg',name:'伊藤 さん',attr:'25歳・大学院生',stars:5,quote:'論文の議論が英語でできるようになって、研究の幅が一気に広がりました。'},
    {img:'/images/lp/proof/proof-9.jpg',name:'渡辺 さん',attr:'41歳・経営者',stars:5,quote:'海外パートナーとの交渉が通訳なしでできるようになりました。ビジネスが加速しています。'},
    {img:'/images/lp/proof/proof-10.jpg',name:'小林 さん',attr:'30歳・フリーランス',stars:5,quote:'毎朝の3分が習慣になりました。気づいたら映画を字幕なしで楽しめるようになっていた。'},
  ]
  const DEMO_STEPS=[
    {icon:'🎧',title:'聞く',label:'リスニング',phrase:'How was your trip?',hint:'フレーズを聞いてみよう',btn:'再生する'},
    {icon:'🎤',title:'話す',label:'スピーキング',phrase:'How was your trip?',hint:'声に出して言ってみよう',btn:'録音する'},
    {icon:'🧠',title:'定着',label:'今日のフレーズ',phrase:'How was your trip?',hint:'意味を思い出そう',btn:'次へ'},
    {icon:'💬',title:'会話',label:'AI会話',phrase:'How was your trip?',hint:'自分の言葉で返してみよう',btn:'返答する'},
  ]
  useEffect(()=>{const t=setInterval(()=>setDemoStep(s=>(s+1)%4),3500);return()=>clearInterval(t)},[])

  useEffect(()=>{track('hero_cta_view')},[])

  const onScroll=useCallback(()=>{
    const y=window.scrollY,h=document.documentElement.scrollHeight-window.innerHeight
    setScrollY(y)
    setSticky(y>400)
    if(!fired&&h>0&&y/h>=0.5){setFired(true);track('scroll_50')}
  },[fired])

  useEffect(()=>{
    window.addEventListener('scroll',onScroll,{passive:true})
    return()=>window.removeEventListener('scroll',onScroll)
  },[onScroll])

  const navy='#1B2A4A', orange='#F97316', gray='#6B7280', light='#F9FAFB'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes fu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes floatScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .float-track{display:flex;gap:14px;animation:floatScroll 32s linear infinite;width:max-content;padding-right:14px}
        .float-pill{flex-shrink:0;padding:8px 18px;border-radius:100px;background:#fff;border:1px solid rgba(0,0,0,0.06);box-shadow:0 2px 8px rgba(0,0,0,0.05);font-size:13px;font-weight:600;color:#1B2A4A;white-space:nowrap}
        .float-pill-accent{flex-shrink:0;padding:8px 18px;border-radius:100px;background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.18);box-shadow:0 2px 8px rgba(249,115,22,0.08);font-size:13px;font-weight:600;color:#F97316;white-space:nowrap}
        @media(max-width:1024px){.float-pill,.float-pill-accent{font-size:12px;padding:6px 14px}}
        @keyframes tMarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .t-track{display:flex;gap:20px;width:max-content;animation:tMarquee 60s linear infinite;padding-right:20px}
        .t-track:hover{animation-play-state:paused}
        .fu{animation:fu 0.6s ease both}
        .fu1{animation-delay:.1s}.fu2{animation-delay:.2s}.fu3{animation-delay:.3s}
        *{box-sizing:border-box;margin:0;padding:0}
        a{text-decoration:none;color:inherit}
        .lp-show-mobile{display:none}
        @media(max-width:1024px){.lp-hide-mobile{display:none !important}.lp-show-mobile{display:inline !important}}
        @media(max-width:1024px){
          /* Hero */
          .lp-header-spacer{height:56px !important}
          .lp-hero-section{min-height:auto !important;padding:24px 16px 32px !important}
          .lp-hero-wrap{flex-direction:column !important;gap:20px !important;padding:0 !important;min-height:auto !important}
          .lp-hero-wrap>div{flex:1 1 100% !important;max-width:100% !important;padding-left:0 !important;margin-right:0 !important}
          .lp-hero-wrap>div:last-child{margin:0 auto}
          .lp-hero-wrap h1{font-size:26px !important;line-height:1.35 !important;word-break:keep-all !important;overflow-wrap:break-word}
          /* Sections */
          .lp-sec{padding:44px 16px !important}
          /* Grids */
          .lp-grid3{grid-template-columns:1fr !important;gap:12px !important}
          .lp-grid3>div{min-height:auto !important;padding:18px 16px !important}
          .lp-grid2{grid-template-columns:1fr !important;gap:12px !important}
          /* Comparison table */
          .lp-compare-wrap{min-width:380px !important}
          .lp-compare-wrap th,.lp-compare-wrap td{padding:10px 6px !important;font-size:12px !important}
          /* FAQ */
          .lp-faq-q{font-size:14px !important;padding:14px 14px !important}
          .lp-faq-a{padding:0 14px 14px !important;font-size:13px !important}
          /* Closing */
          .lp-closing-h2{font-size:22px !important}
          /* Testimonials */
          .t-track{gap:14px !important}
          .t-track>div{width:260px !important;min-height:160px !important;padding:16px 14px !important}
          .t-track>div p{font-size:12px !important}
          /* Headings */
          h2{word-break:keep-all !important;overflow-wrap:break-word}
          /* Empathy section */
          .lp-empathy{padding:36px 16px !important}
          .lp-empathy h2{font-size:22px !important;text-wrap:balance;margin-bottom:12px !important}
          .lp-empathy p:last-of-type{margin-bottom:0 !important}
          /* Cycle heading + flow */
          .lp-cycle-h2{font-size:17px !important}
          .lp-flow-desktop{display:none !important}
          .lp-flow-mobile{display:block !important}
          /* Benefit cards */
          .lp-benefit-card{gap:10px !important;padding:14px !important}
          .lp-benefit-card>div:first-child{width:40px !important;height:40px !important;min-width:40px !important}
          .lp-benefit-desc{font-size:12px !important}
          /* CTA button */
          .lp-cta-btn{font-size:15px !important;padding:14px 32px !important;min-height:46px !important}
          /* Images full width */
          /* Unified mobile image wrappers */
          .lp-img-hero,.lp-img-section{max-width:100% !important;width:100% !important;margin:0 auto 12px !important;margin-right:0 !important;border-radius:16px !important;aspect-ratio:16/9;overflow:hidden;flex:none !important}
          .lp-img-hero img,.lp-img-section img,.lp-closing-img{width:100% !important;height:100% !important;object-fit:cover !important;border-radius:16px !important}
          .lp-img-hero img{object-position:center 20% !important}
          .lp-closing-img{aspect-ratio:16/9 !important;height:auto !important}
          .lp-hero-img-desktop{display:none !important}
          .lp-hero-img-mobile{display:block !important}
          .lp-hero-wrap>div:last-child{max-width:100% !important}
          /* Normalize parent side padding for images */
          .lp-empathy>div{padding:0 !important}
          .lp-empathy>div>div:first-child{padding:0 16px}
        }
        ${LP_FOOTER_CSS}
      `}</style>

      <div style={{fontFamily:"'Hiragino Sans','Noto Sans JP',sans-serif",background:'#fff',color:navy,overflowX:'hidden'}}>

        {/* ── NAV ── */}
        <AppHeader scrollY={scrollY} />
        <div className="lp-header-spacer" style={{height:72}} />

        {/* ── HERO ── full-height, 2-col on desktop ── */}
        <section className="lp-hero-section" style={{background:'linear-gradient(160deg,#FFFBF5 0%,#fff 60%)',minHeight:'calc(100vh - 72px)',display:'flex',flexDirection:'column',justifyContent:'flex-start',padding:'64px 22px 40px'}}>
          <div className="lp-hero-wrap" style={{maxWidth:1140,margin:'0 auto',width:'100%',display:'flex',flexWrap:'wrap',alignItems:'center',gap:48,justifyContent:'center'}}>
            {/* Left — text + CTA */}
            <div style={{flex:'1 1 360px',minWidth:280,maxWidth:560,paddingLeft:56}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(249,115,22,0.1)',border:'1px solid rgba(249,115,22,0.22)',padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:700,color:orange,marginBottom:16}}>
                <LpIcon emoji="🎙️" size={14} /> 話すための語学トレーニング
              </div>
              <h1 style={{fontSize:'clamp(28px,7vw,42px)',fontWeight:900,color:navy,lineHeight:1.35,letterSpacing:'-0.025em',marginBottom:14,textAlign:'center'}}>
                3ヶ月後、<br /><span style={{color:orange}}>世界の人々と<br />自然に話せるあなたへ</span>
              </h1>
              <p style={{fontSize:15,color:gray,lineHeight:1.7,marginBottom:28,textAlign:'center',maxWidth:560,margin:'0 auto 28px'}}>
                毎朝、短時間の会話で、言葉が自然に出てくる。
              </p>
              <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8,marginBottom:20}}>
                {[
                  {flag:'🇺🇸',label:'English'},
                  {flag:'🇰🇷',label:'한국어'},
                  {flag:'🌏',label:'さらに拡大予定'},
                ].map((lang,i)=>(
                  <span key={i} style={{display:'inline-flex',alignItems:'center',gap:5,background:i<2?'rgba(249,115,22,0.08)':'rgba(0,0,0,0.04)',border:i<2?'1px solid rgba(249,115,22,0.18)':'1px solid rgba(0,0,0,0.08)',padding:'6px 14px',borderRadius:100,fontSize:13,fontWeight:600,color:i<2?navy:gray}}>{lang.flag} {lang.label}</span>
                ))}
              </div>
              <div style={{marginTop:20}}><CTA loc="hero" large /></div>
              <p style={{marginTop:14,fontSize:13,color:gray,textAlign:'center',fontStyle:'italic'}}>多くの人が、1週間以内に「話せる感覚」を実感しています</p>
            </div>
            {/* Right — hero image with overlays */}
            <div className="lp-img-hero" style={{flex:'1 1 340px',position:'relative',maxWidth:420,marginRight:48,borderRadius:20,overflow:'hidden'}}>
              <Image
                className="lp-hero-img-desktop"
                src="/images/lp/hero/hero-conversation-1.jpg"
                alt="自信を持って話す女性"
                width={840} height={840}
                style={{width:'100%',height:'auto',display:'block'}}
                priority
              />
              <Image
                className="lp-hero-img-mobile"
                src="/images/lp/hero/hero-conversation-sp-1.jpg"
                alt="自信を持って話す女性"
                width={840} height={1050}
                style={{width:'100%',height:'auto',display:'none'}}
                priority
              />
              {/* Bottom text overlay */}
              <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.12) 60%, transparent 100%)',padding:'48px 24px 24px',zIndex:3}}>
                <div style={{display:'flex',flexDirection:'column',gap:6,maxWidth:220}}>
                  <span style={{fontSize:10,letterSpacing:'0.16em',fontWeight:600,color:'rgba(255,255,255,0.72)'}}>FEEL THE CHANGE</span>
                  <span style={{fontSize:15,fontWeight:600,lineHeight:1.35,color:'rgba(255,255,255,0.92)'}}>話せるようになると、</span>
                  <span style={{fontSize:22,fontWeight:800,lineHeight:1.2,color:'#fff'}}>毎日がもっと自由に。</span>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ── FLOATING SOCIAL PROOF ── */}
        <div style={{overflow:'hidden',padding:'20px 0',background:light}}>
          <div className="float-track">
            {[...Array(2)].flatMap(()=>['3日目で話しやすくなった','毎日3分なら続く','海外の人と話せた！','AIだから恥ずかしくない','通勤中にできる','英語が怖くなくなった','続けるだけで変わる','1週間で実感した']).map((c,i)=>(
              <span key={i} className={i%5===2?'float-pill-accent':'float-pill'}>{c}</span>
            ))}
          </div>
        </div>

        {/* ── EMPATHY ── */}
        <section className="lp-empathy" style={{background:light,padding:'64px 22px'}}>
          <div style={{maxWidth:1140,margin:'0 auto',padding:'0 24px'}}>
            {/* Text block — centered narrow */}
            <div style={{maxWidth:720,margin:'0 auto',textAlign:'center'}}>
              <Badge>😔 こんな経験ありませんか？</Badge>
              <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:16,letterSpacing:'-0.02em'}}>
                ずっと英語を勉強しているのに<br />いざ話そうとすると<span style={{color:orange,whiteSpace:'nowrap'}}>何も出てこない</span>
              </h2>
              <p style={{fontSize:14,color:gray,lineHeight:1.85,marginBottom:12}}>これ、あなたも経験ありませんか？</p>
              <p style={{fontSize:15,fontWeight:700,color:orange,lineHeight:1.7,marginBottom:20}}>英語で話しかけられた瞬間、頭が真っ白になる</p>
            </div>

            {/* Empathy image — centered */}
            <div className="lp-img-section" style={{width:'100%',maxWidth:720,margin:'0 auto 12px',position:'relative',aspectRatio:'16 / 9',borderRadius:16,overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}}>
              <Image
                src="/images/lp/scene/conversation-cant-respond-1.jpg"
                alt="北欧の女性が日本人女性に道を聞き、日本人女性が少し困っている場面"
                fill
                sizes="(max-width: 768px) 100vw, 720px"
                style={{objectFit:'cover'}}
              />
            </div>
            <p style={{fontSize:13,color:gray,fontStyle:'italic',textAlign:'center',marginBottom:0}}>「知識はある。でも、話せない」</p>
          </div>
        </section>

        {/* ── PROBLEM ESSENCE ── */}
        <Sec bg="#fff">
          <div style={{background:`linear-gradient(160deg,#FFFBF5,#fff)`,border:'1.5px solid rgba(249,115,22,0.22)',borderRadius:20,padding:'28px 22px',textAlign:'center',marginBottom:0}}>
            <p style={{fontSize:14,color:gray,marginBottom:10}}>原因は「知識不足」ではありません。</p>
            <h2 style={{fontSize:'clamp(22px,6vw,32px)',fontWeight:700,color:navy,lineHeight:1.25,marginBottom:16,textAlign:'center'}}>
              <span style={{fontWeight:700}}>話す量</span>が<span style={{fontWeight:900,color:orange,fontSize:'clamp(24px,6.5vw,35px)',letterSpacing:'0.03em'}}>圧倒的</span>に<br /><span style={{fontSize:'clamp(20px,5vw,28px)'}}>足りないのです。</span>
            </h2>
            <p style={{fontSize:14,color:gray,lineHeight:1.8}}>このままでは、いつまで経っても話せるようにはなりません。<br /><br />でも、やり方を変えれば、<br /><span style={{fontWeight:700,fontSize:15}}>あなたも自然に話せるようになります。</span></p>
          </div>
        </Sec>

        {/* ── WHY IT WORKS (B: mystery + trust) ── */}
        <Sec bg="#0f172a">
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em',textAlign:'center',color:'#fff'}}>
            いつの間にか、<span style={{color:orange}}>話せるようになる</span>
          </h2>
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:16,margin:'20px 0 16px'}}>
            {[{icon:'🎧',label:'聞く'},{icon:'🗣',label:'話す'},{icon:'✨',label:'定着'}].map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:16}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,background:'rgba(255,255,255,0.08)',borderRadius:14,padding:'14px 20px',minWidth:72}}>
                  <LpIcon emoji={s.icon} size={24} />
                  <span style={{fontSize:13,fontWeight:600,color:'#fff'}}>{s.label}</span>
                </div>
                {i<2&&<span style={{fontSize:14,color:'rgba(255,255,255,0.35)'}}>→</span>}
              </div>
            ))}
          </div>
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:16,padding:'28px 28px',textAlign:'center',lineHeight:2.0,fontSize:15,color:'rgba(255,255,255,0.7)',maxWidth:560,margin:'0 auto'}}>
            <p style={{margin:'0 0 16px'}}>NativeFlowのレッスンは、<br />多くの人が自然に話せるようになる流れで設計されています。</p>
            <p style={{margin:'0 0 16px',fontWeight:700,color:'#fff'}}>やることはシンプル。</p>
            <p style={{margin:0}}>だから、<br /><span style={{fontWeight:800,color:orange}}>続けると確実に変化が出ます。</span></p>
          </div>
        </Sec>

        {/* ── MULTILINGUAL ── */}
        <Sec bg={light}>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em',textAlign:'center'}}>
            いろいろな言語が話せるようになる
          </h2>
          <div style={{background:'#fff',borderRadius:16,padding:'32px 24px',textAlign:'center',lineHeight:2.0,fontSize:15,color:navy,border:'1px solid rgba(0,0,0,0.06)'}}>
            <p style={{margin:'0 0 16px'}}>NativeFlowは、多くの言語が学べるように日々進化しています。</p>
            <p style={{margin:0,fontWeight:700,color:orange}}>どの言語も、<span style={{whiteSpace:'nowrap'}}>NativeFlow独自のレッスン設計で、</span><br />あなたも自然に話せるようになります。</p>
          </div>
        </Sec>

        {/* ── NEW LEARNING ── */}
        <section style={{background:light,padding:'24px 22px 64px'}}><div style={{maxWidth:820,margin:'0 auto'}}>
          <Badge>💡 新しい学習法</Badge>
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:12,alignItems:'center',marginBottom:20}}>
            <div style={{background:'#FFF5F5',border:'1px solid #FECACA',borderRadius:14,padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#DC2626',marginBottom:6}}>これまで</div>
              <div style={{fontSize:14,fontWeight:700,color:navy}}><span className="lp-hide-mobile">単語・文法を覚えるだけ</span><span className="lp-show-mobile">単語・文法のみ</span></div>
            </div>
            <div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:32,height:32,margin:'0 8px',color:orange}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M2 12H22M22 12L15 5M22 12L15 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:14,padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#16A34A',marginBottom:6}}>NativeFlow</div>
              <div style={{fontSize:14,fontWeight:700,color:navy}}>音を覚えて、話す</div>
            </div>
          </div>
          <div style={{background:navy,borderRadius:16,padding:'20px',textAlign:'center'}}>
            <h3 style={{fontSize:16,fontWeight:800,color:'#fff',lineHeight:1.5}}>
              NativeFlowは<br /><span style={{color:'#FB923C'}}>「新しい言語を使える脳」</span>を構築します。
            </h3>
          </div>
        </div></section>

        {/* ── LESSON DEMO ── */}
        <Sec bg="#fff">
          <Badge><LpIcon emoji="🎙️" size={14} /> レッスン体験</Badge>
          <h2 style={{fontSize:'clamp(20px,5vw,26px)',fontWeight:900,lineHeight:1.4,marginBottom:8,letterSpacing:'-0.02em',textAlign:'center'}}>
            たった3分で、<br /><span style={{color:orange}}>自然に話せる練習ができる</span>
          </h2>
          <p style={{fontSize:14,color:gray,fontWeight:500,marginBottom:28,textAlign:'center'}}>見れば、他との違いがわかる</p>

          {/* Lesson UI mock */}
          <div style={{background:'#fff',borderRadius:20,border:'1px solid rgba(0,0,0,0.08)',boxShadow:'0 4px 20px rgba(0,0,0,0.06)',overflow:'hidden',maxWidth:400,margin:'0 auto'}}>
            {/* Mock top bar */}
            <div style={{background:navy,padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,fontWeight:700,color:'#fff'}}>NativeFlow</span>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.6)'}}>{DEMO_STEPS[demoStep].title}</span>
            </div>
            {/* Mock content */}
            <div key={demoStep} style={{padding:'24px 24px',textAlign:'center',minHeight:190,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,animation:'fu 0.4s ease both'}}>
              <span style={{fontSize:11,fontWeight:600,color:gray,letterSpacing:'0.05em'}}>{DEMO_STEPS[demoStep].label}</span>
              <LpIcon emoji={DEMO_STEPS[demoStep].icon} size={40} />
              <span style={{fontSize:20,fontWeight:800,color:navy,lineHeight:1.3}}>{DEMO_STEPS[demoStep].phrase}</span>
              <span style={{fontSize:13,color:gray,marginTop:2}}>{DEMO_STEPS[demoStep].hint}</span>
              <div style={{marginTop:10,background:orange,color:'#fff',fontSize:13,fontWeight:700,padding:'9px 26px',borderRadius:100,boxShadow:'0 4px 12px rgba(249,115,22,0.3)',transition:'transform 0.15s ease',cursor:'pointer'}}>{DEMO_STEPS[demoStep].btn}</div>
            </div>
          </div>

          {/* Step indicators */}
          <div style={{display:'flex',justifyContent:'center',gap:24,marginTop:24}}>
            {DEMO_STEPS.map((s,i)=>(
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,opacity:demoStep===i?1:0.45,transition:'opacity 0.3s ease',cursor:'pointer'}} onClick={()=>setDemoStep(i)}>
                <LpIcon emoji={s.icon} size={22} />
                <span style={{fontSize:12,fontWeight:700,color:demoStep===i?orange:gray}}>{s.title}</span>
              </div>
            ))}
          </div>

          {/* Progress dots */}
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:14}}>
            {DEMO_STEPS.map((_,i)=>(
              <div key={i} style={{width:demoStep===i?20:6,height:6,borderRadius:3,background:demoStep===i?orange:'rgba(0,0,0,0.12)',transition:'all 0.3s ease'}} />
            ))}
          </div>
        </Sec>

        {/* ── HOW IT WORKS ── */}
        <Sec bg={light} id="flow">
          <Badge><LpIcon emoji="🧠" size={14} /> 学習サイクル</Badge>
          <h2 className="lp-cycle-h2" style={{fontSize:'clamp(18px,5vw,24px)',fontWeight:900,lineHeight:1.4,marginBottom:6,letterSpacing:'-0.02em',whiteSpace:'nowrap'}}>
            このサイクルで<span style={{color:orange}}>「語学脳」</span>を作りあげます
          </h2>
          <p style={{fontSize:13,color:gray,marginBottom:20}}>毎日続けることで、考えなくても口から言葉が出てくる状態になります。</p>
          {/* Desktop: horizontal flow */}
          <div className="lp-flow-desktop" style={{display:'flex',justifyContent:'space-evenly',alignItems:'center',background:'#fff',borderRadius:16,padding:'14px 24px 20px',border:'1px solid rgba(0,0,0,0.07)',marginBottom:20,flexWrap:'wrap',gap:8}}>
            {[
              {n:'聞く',sub:'耳で覚える'},
              {n:'リピート',sub:'真似る'},
              {n:'会話',sub:'実践する'},
              {n:'定着',sub:'使えるに'},
            ].map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{textAlign:'center',minWidth:56}}>
                  <div style={{width:32,height:32,background:'linear-gradient(135deg,#F97316,#FB923C)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 5px',color:'#fff',fontWeight:800,fontSize:10}}>{i+1}</div>
                  <div style={{fontSize:12,fontWeight:800,color:navy}}>{s.n}</div>
                  <div style={{fontSize:10,color:gray}}>{s.sub}</div>
                </div>
                {i<3&&<div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:36,height:28,color:orange,flex:'0 0 auto',marginLeft:36}}><svg width="32" height="22" viewBox="0 0 32 24" fill="none"><path d="M2 12H30M30 12L22 5M30 12L22 19" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
              </div>
            ))}
          </div>
          {/* Mobile: 2x2 grid flow */}
          <div className="lp-flow-mobile" style={{display:'none',marginBottom:20}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,background:'#fff',borderRadius:16,padding:'20px 16px',border:'1px solid rgba(0,0,0,0.07)'}}>
              {[
                {n:'聞く',sub:'耳で覚える',num:1},
                {n:'リピート',sub:'真似る',num:2},
                {n:'会話',sub:'実践する',num:3},
                {n:'定着',sub:'使えるに',num:4},
              ].map((s)=>(
                <div key={s.num} style={{textAlign:'center',padding:'12px 8px'}}>
                  <div style={{width:40,height:40,background:'linear-gradient(135deg,#F97316,#FB923C)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',color:'#fff',fontWeight:800,fontSize:14}}>{s.num}</div>
                  <div style={{fontSize:15,fontWeight:800,color:navy,marginBottom:2}}>{s.n}</div>
                  <div style={{fontSize:12,color:gray}}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <Badge><LpIcon emoji="🎯" size={14} /> 他との違い</Badge>
          <div className="lp-grid3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {[
              {icon:'🎧',t:'文字中心ではなく音中心',b:'聞いて話す練習に集中。読む負担ゼロ。'},
              {icon:'🤖',t:'AIと話してアウトプット',b:'24時間失敗を恐れずに練習できる相手がいる。'},
              {icon:'🎯',t:'1文ずつしっかり身につけていく',b:'曖昧な理解ではなく、使える状態まで定着させる。'},
            ].map((f,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:16,padding:'24px 20px',border:'1px solid rgba(0,0,0,0.07)',display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',gap:10,minHeight:180}}>
                <LpIcon emoji={f.icon} size={38} />
                <div style={{fontSize:14,fontWeight:700,color:navy,lineHeight:1.35}}>{f.t}</div>
                <div style={{fontSize:12,color:gray,lineHeight:1.6}}>{f.b}</div>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── BENEFITS ── */}
        <Sec bg="#fff">
          <Badge>🌟 こう変わる</Badge>
          <div style={{display:'flex',flexWrap:'wrap',gap:28,alignItems:'center'}}>
            {/* Left — cards */}
            <div style={{flex:'1 1 320px',display:'flex',flexDirection:'column',gap:12}}>
              {[
                {icon:'🧠',t:'考えずに言葉が出る',b:'頭で翻訳せず、自然に口から言葉が出る状態へ。'},
                {icon:'💬',t:'自然に会話が続く',b:'海外の人ともテンポよくやり取りできるように。'},
                {icon:'🌏',t:'語学で世界が変わる',b:'出会い・情報・仕事の選択肢が広がります。'},
              ].map((b,i)=>(
                <div key={i} className="lp-benefit-card" style={{display:'flex',alignItems:'center',gap:14,padding:'18px',background:light,borderRadius:14,border:'1px solid rgba(0,0,0,0.06)'}}>
                  <div style={{width:48,height:48,minWidth:48,background:'rgba(249,115,22,0.1)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center'}}><LpIcon emoji={b.icon} size={24} /></div>
                  <div><div style={{fontSize:15,fontWeight:800,color:navy,marginBottom:4}}>{b.t}</div><div className="lp-benefit-desc" style={{fontSize:13,color:gray,lineHeight:1.65}}>{b.b}</div></div>
                </div>
              ))}
            </div>
            {/* Right — image */}
            <div className="lp-img-section" style={{flex:'0 1 340px',borderRadius:16,overflow:'hidden'}}>
              <Image src="/images/lp/scene/scene-cafe-1.jpg" alt="カフェで自然に会話を楽しむ" width={680} height={480} style={{width:'100%',height:'auto',objectFit:'cover',display:'block'}} />
              <p style={{fontSize:12,color:gray,textAlign:'center',marginTop:10}}>話せるようになると、世界とのつながりが一気に広がる。</p>
            </div>
          </div>
        </Sec>

        {/* ── CTA mid ── */}
        <Sec bg={light}>
          <CTA loc="mid" label="無料ではじめる" />
        </Sec>

        {/* ── TESTIMONIALS MARQUEE ── */}
        <section style={{background:'#fff',padding:'64px 0',overflow:'hidden'}}>
          <div style={{maxWidth:820,margin:'0 auto 24px',padding:'0 22px'}}>
            <Badge>💬 実際に変わった体験談</Badge>
          </div>
          <div className="t-track">
            {[...TESTIMONIALS,...TESTIMONIALS].map((t,i)=>(
              <div key={i} style={{
                background:'#fff',borderRadius:16,padding:'22px 20px',
                border:'1px solid rgba(0,0,0,0.07)',boxShadow:'0 2px 10px rgba(0,0,0,0.04)',
                width:300,flexShrink:0,
                display:'flex',flexDirection:'column',justifyContent:'space-between',minHeight:200,
              }}>
                <div>
                  <div style={{display:'flex',gap:2,marginBottom:8}}>{Array.from({length:t.stars}).map((_,j)=><span key={j} style={{color:'#FBBF24',fontSize:12,opacity:0.8}}>★</span>)}</div>
                  <p style={{fontSize:13,lineHeight:1.85,color:'#374151',fontStyle:'italic',borderLeft:`3px solid ${orange}`,paddingLeft:12,marginBottom:0}}>「{t.quote}」</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginTop:14}}>
                  <Image src={t.img} alt={t.name} width={36} height={36} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',objectPosition:'center top'}} />
                  <div><div style={{fontSize:13,fontWeight:700,color:navy}}>{t.name}</div><div style={{fontSize:11,color:gray}}>{t.attr}</div></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── UNIFIED CLOSING CONVERSION ── */}
        <section style={{background:'#fff',padding:'56px 22px',borderTop:'1px solid rgba(0,0,0,0.05)'}}>
          <div style={{maxWidth:820,margin:'0 auto',textAlign:'center'}}>
            {/* Reassurance heading */}
            <p style={{fontSize:13,fontWeight:600,color:gray,marginBottom:8}}>迷わず始められます</p>
            <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:24,letterSpacing:'-0.02em',color:navy}}>
              7日間、<span style={{color:orange}}>全機能を無料</span>で試せます
            </h2>

            {/* Reassurance pills */}
            <div className="lp-grid3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:28}}>
              {[
                {icon:'🆓',title:'7日間完全無料',sub:'すぐ始められる'},
                {icon:'🌱',title:'初心者OK',sub:'レベル自動調整'},
                {icon:'⏱️',title:'1日3分から',sub:'スキマ時間でOK'},
              ].map((item,i)=>(
                <div key={i} style={{padding:'16px 12px',borderRadius:14,background:light,border:'1px solid rgba(0,0,0,0.05)',display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <LpIcon emoji={item.icon} size={24} />
                  <div style={{fontSize:13,fontWeight:800,color:navy}}>{item.title}</div>
                  <div style={{fontSize:11,color:gray}}>{item.sub}</div>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <div className="lp-grid3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:32}}>
              {[
                {icon:'🎙️',t:'AI会話レッスン',b:'日常生活に沿ったレッスンで、AIと自然に会話できます。'},
                {icon:'🧠',t:'SRS復習',b:'脳科学に基づいて、最適なタイミングで復習できます。'},
                {icon:'💎',t:'成長が楽しい',b:'ダイヤやランクアップで、続けるほど成長が楽しくなります。'},
              ].map((item,i)=>(
                <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',gap:8,padding:'22px 16px',background:light,borderRadius:16,border:'1px solid rgba(0,0,0,0.06)',minHeight:160}}>
                  <LpIcon emoji={item.icon} size={32} />
                  <div style={{fontSize:14,fontWeight:700,color:navy,marginBottom:2}}>{item.t}</div>
                  <div style={{fontSize:12,color:'#4B5563',lineHeight:1.7}}>{item.b}</div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <CTA loc="free-experience" />
          </div>
        </section>

        {/* ── FEATURES ── */}
        <Sec bg={light} id="features">
          <Badge><LpIcon emoji="🎯" size={14} /> NativeFlowの特長</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em'}}>
            他の語学学習と<span style={{color:orange}}>ここが違います</span>
          </h2>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {icon:'🏠',t:'日常生活がそのまま教材',b:'朝・通勤・カフェ・仕事——あなたの1日に沿ったシーンで練習するから、明日からすぐ使えます。'},
              {icon:'🎧',t:'文字ではなく「音」中心',b:'聞いて話すことに集中。読む負担ゼロ。スキマ時間3分から始められます。'},
              {icon:'🤖',t:'AIが24時間練習相手',b:'いつでもどこでも話せる相手がいる。失敗しても恥ずかしくない。だから続けられる。'},
              {icon:'🧠',t:'自然に定着する復習設計',b:'脳科学に基づいて、最適なタイミングで復習できます。'},
              {icon:'🎯',t:'あなただけのカリキュラム',b:'目標・レベル・生活スタイルに合わせてAIが最適なレッスンを毎日生成します。'},
              {icon:'🌏',t:'英語・韓国語に対応、さらに拡大予定',b:'現在は英語と韓国語をサポート。今後さらに多くの言語に対応し、世界中の人と話せるプラットフォームを目指しています。'},
            ].map((f,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid rgba(0,0,0,0.07)',display:'flex',gap:14,alignItems:'flex-start',boxShadow:'0 1px 6px rgba(0,0,0,0.04)'}}>
                <div style={{width:44,height:44,minWidth:44,background:'rgba(249,115,22,0.1)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center'}}><LpIcon emoji={f.icon} size={22} /></div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:navy,marginBottom:4}}>{f.t}</div>
                  <div style={{fontSize:12,color:gray,lineHeight:1.7}}>{f.b}</div>
                </div>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── USER TYPE ── */}
        <Sec bg="#fff">
          <div style={{maxWidth:640,margin:'0 auto'}}>
          <Badge>👤 こんな方におすすめ</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em'}}>
            こんな方に<span style={{color:orange}}>おすすめです</span>
          </h2>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              'とにかく外国語を話せるようになりたい方',
              '勉強してるのに英語が口から出てこない方',
              '海外旅行で自然に話したい方',
              '仕事で英語が必要になった方',
              '将来は海外で働きたい方',
              '世界の情報をもっと知りたい方',
            ].map((text,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:light,borderRadius:12,border:'1px solid rgba(0,0,0,0.06)'}}>
                <div style={{width:24,height:24,minWidth:24,background:'rgba(22,163,74,0.1)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#16A34A',fontWeight:800,fontSize:13}}>✓</span></div>
                <span style={{fontSize:14,fontWeight:600,color:navy}}>{text}</span>
              </div>
            ))}
          </div>
          </div>
        </Sec>

        {/* ── COMPARISON ── */}
        <Sec bg={light}>
          <Badge><LpIcon emoji="📊" size={14} /> 比較</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em'}}>
            代表的な学習方法との<span style={{color:orange}}>比較</span>
          </h2>
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <table className="lp-compare-wrap" style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:500}}>
              <thead>
                <tr style={{borderBottom:`2px solid ${orange}`}}>
                  <th style={{textAlign:'left',padding:'12px 10px',fontWeight:800,color:navy}}></th>
                  <th style={{textAlign:'center',padding:'12px 10px',fontWeight:800,color:orange,background:'rgba(249,115,22,0.06)',borderRadius:'8px 8px 0 0'}}>NativeFlow</th>
                  <th style={{textAlign:'center',padding:'12px 10px',fontWeight:700,color:gray}}><span className="lp-hide-mobile">一般的な英会話教室</span><span className="lp-show-mobile">英会話教室</span></th>
                  <th style={{textAlign:'center',padding:'12px 10px',fontWeight:700,color:gray}}><span className="lp-hide-mobile">一般的な学習アプリ</span><span className="lp-show-mobile">学習アプリ</span></th>
                </tr>
              </thead>
              <tbody>
                {[
                  {label:'話す練習量',mLabel:'話す量',nf:'◎ 毎日話せる機会',mNf:'◎ 毎日話せる',school:'△ 週1回程度のことも',mSchool:'△ 週1回程度',app:'△ 少なめのものも',mApp:'△ 少なめ'},
                  {label:'料金',nf:'◎ 月額1,650円〜*',school:'△ 月数千円〜数万円',app:'○ 無料プランあり',nfHighlight:true},
                  {label:'時間の自由度',mLabel:'時間自由',nf:'◎ 24時間いつでも',mNf:'◎ 24時間OK',school:'△ 予約制が一般的',mSchool:'△ 予約制',app:'◎ いつでも使える',mApp:'◎ いつでもOK'},
                  {label:'アウトプット',mLabel:'実践',nf:'◎ 話す実践中心',mNf:'◎ 実践中心',school:'○ 会話中心のことも',mSchool:'○ 会話中心',app:'△ インプット中心のものも',mApp:'△ インプット中心'},
                  {label:'恥ずかしさ',nf:'◎ AIで練習しやすい',mNf:'◎ AIで安心',school:'△ 対人で緊張することも',mSchool:'△ 対人で緊張',app:'○ 一人で進めやすい',mApp:'○ 一人でOK'},
                  {label:'記憶定着',mLabel:'定着',nf:'◎ SRS搭載',school:'△ サービス次第',app:'△ 機能による'},
                ].map((row,i)=>{
                  const sym=(v:string)=>{const s=v.charAt(0);if(s==='◎')return{color:'#16A34A',fontWeight:800};if(s==='○')return{color:navy,fontWeight:600};if(s==='△')return{color:'#9CA3AF',fontWeight:600};return{color:'#DC2626',fontWeight:600}}
                  const ml=('mLabel' in row&&row.mLabel)?row.mLabel:null
                  const mn=('mNf' in row&&row.mNf)?row.mNf:null
                  const ms=('mSchool' in row&&row.mSchool)?row.mSchool:null
                  const ma=('mApp' in row&&row.mApp)?row.mApp:null
                  return(
                  <tr key={i} style={{borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
                    <td style={{padding:'12px 10px',fontWeight:700,color:navy,fontSize:13}}>{ml?<><span className="lp-hide-mobile">{row.label}</span><span className="lp-show-mobile">{ml}</span></>:row.label}</td>
                    <td style={{padding:'12px 10px',textAlign:'center',background:'rgba(249,115,22,0.04)',...sym(row.nf),...('nfHighlight' in row&&row.nfHighlight?{color:orange}:{})}}>{mn?<><span className="lp-hide-mobile">{row.nf}</span><span className="lp-show-mobile">{mn}</span></>:row.nf}</td>
                    <td style={{padding:'12px 10px',textAlign:'center',...sym(row.school)}}>{ms?<><span className="lp-hide-mobile">{row.school}</span><span className="lp-show-mobile">{ms}</span></>:row.school}</td>
                    <td style={{padding:'12px 10px',textAlign:'center',...sym(row.app)}}>{ma?<><span className="lp-hide-mobile">{row.app}</span><span className="lp-show-mobile">{ma}</span></>:row.app}</td>
                  </tr>
                )})}
              </tbody>
            </table>
            <p style={{fontSize:11,color:gray,marginTop:10,textAlign:'right',opacity:0.7}}>* 年額プランを月換算した場合</p>
          </div>
        </Sec>

        {/* ── FAQ ── */}
        <Sec bg="#fff" id="faq">
          <Badge>❓ よくある質問</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em'}}>
            よくある質問
          </h2>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {q:'NativeFlowはどんなサービスですか？',a:'起床から就寝まで日常生活に沿った内容で、音声を中心に学べる語学サービスです。復習機能や成長要素もあり、楽しく続けながら自然に話せるようになることを目指しています。'},
              {q:'英語以外も学べますか？',a:'現在は英語と韓国語に対応しており、今後さらに多くの言語に対応予定です。'},
              {q:'初心者でも使えますか？',a:'はい。レベルに合わせてレッスンが調整されます。まずは7日間無料でお試しいただけます。'},
              {q:'1日どれくらい使えばいいですか？',a:'3〜5分から効果があります。通勤中やお昼休みなど、スキマ時間で十分です。'},
              {q:'7日間無料のあとどうなりますか？',a:'7日間の無料期間後、継続をご希望の場合はクレジットカードをご登録のうえ、有料プランをご利用いただけます。'},
              {q:'いつでも解約できますか？',a:'はい。解約はいつでも可能で、解約後も期間満了まではご利用いただけます。'},
              {q:'他の語学アプリと何が違いますか？',a:'NativeFlowは「話す」ことに特化しています。読む・書くのではなく、言葉の音と実際に口から発することを中心とした学習アプリです。'},
            ].map((item,i)=>(
              <details key={i} style={{background:light,borderRadius:14,border:'1px solid rgba(0,0,0,0.06)',overflow:'hidden'}}>
                <summary className="lp-faq-q" style={{padding:'16px 18px',fontSize:14,fontWeight:700,color:navy,cursor:'pointer',listStyle:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  {item.q}
                  <span style={{color:orange,fontSize:18,fontWeight:400,marginLeft:12,flexShrink:0}}>+</span>
                </summary>
                <div className="lp-faq-a" style={{padding:'0 18px 16px',fontSize:13,color:gray,lineHeight:1.8}}>
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </Sec>

        {/* ── PRICING ── */}
        <Sec bg={light} id="pricing">
          <Badge><LpIcon emoji="💰" size={14} /> 料金プラン</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:8,letterSpacing:'-0.02em'}}>
            シンプルな<span style={{color:orange}}>料金体系</span>
          </h2>
          <p style={{fontSize:14,color:gray,marginBottom:24,lineHeight:1.7}}>まずは7日間無料でお試しください。すぐに始められます。</p>
          <div className="lp-grid2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {/* Monthly */}
            <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',border:'1px solid rgba(0,0,0,0.08)',textAlign:'center'}}>
              <div style={{fontSize:13,fontWeight:700,color:gray,marginBottom:4}}>月額プラン</div>
              <div style={{fontSize:11,color:gray,marginBottom:8}}>気軽に始めたい方に</div>
              <div style={{fontSize:32,fontWeight:900,color:navy,marginBottom:4}}>¥2,480<span style={{fontSize:14,fontWeight:600,color:gray}}>/月</span></div>
              <div style={{fontSize:12,color:gray,marginBottom:16}}>いつでも解約OK</div>
              <CTA loc="pricing-monthly" label="月額プランで無料体験" compact />
            </div>
            {/* Yearly */}
            <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',border:`2px solid ${orange}`,textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,right:0,background:orange,color:'#fff',fontSize:10,fontWeight:800,padding:'4px 12px',borderRadius:'0 0 0 8px'}}>人気No.1</div>
              <div style={{fontSize:13,fontWeight:700,color:orange,marginBottom:8}}>年額プラン</div>
              <div style={{fontSize:32,fontWeight:900,color:navy,marginBottom:4}}>¥19,800<span style={{fontSize:14,fontWeight:600,color:gray}}>/年</span></div>
              <div style={{fontSize:14,fontWeight:700,color:orange,marginBottom:4}}>1日たった約55円</div>
              <div style={{fontSize:12,fontWeight:700,color:'#16A34A',marginBottom:16}}>年間で約10,000円お得</div>
              <CTA loc="pricing-yearly" label="年額プランで無料体験" compact />
            </div>
          </div>
        </Sec>

        {/* ── CLOSING ── */}
        <section style={{background:navy,padding:'56px 22px',textAlign:'center'}}>
          <div style={{maxWidth:820,margin:'0 auto'}}>
            {/* Closing image */}
            <div style={{borderRadius:16,overflow:'hidden',marginBottom:24,boxShadow:'0 8px 24px rgba(0,0,0,0.2)'}}>
              <Image className="lp-closing-img" src="/images/lp/hero/hero-conversation-3.jpg" alt="自然に会話を楽しむ" width={480} height={320} style={{width:'100%',height:280,objectFit:'cover',objectPosition:'center 30%'}} />
            </div>
            <h2 className="lp-closing-h2" style={{fontSize:'clamp(20px,5.5vw,30px)',fontWeight:900,color:'#fff',lineHeight:1.35,marginBottom:12,letterSpacing:'-0.02em'}}>
              今この瞬間から、<br /><span style={{color:'#FB923C'}}>「話せる側」</span>に<br />変わってください。
            </h2>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.75)',marginBottom:28,lineHeight:1.8}}>
              3ヶ月後、話せる自分に出会えます。
            </p>
            <CTA label="無料ではじめる" loc="final" large />
            <p style={{marginTop:20,fontSize:13,color:'rgba(255,255,255,0.5)'}}>
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" style={{color:'#FB923C',fontWeight:700}}>ログイン</Link>
            </p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <AppFooter />

      </div>
    </>
  )
}

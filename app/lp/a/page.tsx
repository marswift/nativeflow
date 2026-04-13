'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import AppHeader from '@/components/header/app-header'
import AppFooter, { LP_FOOTER_CSS } from '@/components/footer/app-footer'

// ── Analytics ─────────────────────────────────────────────────────────────
type LpEvent = 'hero_cta_view'|'cta_click'|'scroll_50'|'signup_complete'
function track(e: LpEvent, p?: Record<string,string|number|boolean>) {
  try { fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:e,properties:{...p,variant:'A'}}),keepalive:true}).catch(()=>{}) } catch{}
}

// ── CTA ───────────────────────────────────────────────────────────────────
function CTA({ label='無料ではじめる', loc='inline', large=false }:{label?:string;loc?:string;large?:boolean}) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
      <p style={{fontSize:14,fontWeight:600,color:'#1B2A4A',opacity:0.7,textAlign:'center',marginBottom:4}}>今この瞬間から、「話せる側」に変わってください。</p>
      <Link href="/signup" onClick={()=>track('cta_click',{location:loc})} style={{
        display:'flex',alignItems:'center',justifyContent:'center',
        background:'linear-gradient(135deg,#F97316 0%,#FB923C 100%)',
        color:'#fff',fontFamily:"'Hiragino Sans','Noto Sans JP',sans-serif",
        fontSize:large?18:16,fontWeight:800,
        padding:large?'18px 44px':'15px 36px',
        borderRadius:100,textDecoration:'none',width:'100%',maxWidth:340,
        boxShadow:'0 8px 24px rgba(249,115,22,0.38)',minHeight:52,
        letterSpacing:'-0.01em',
      }}>{label} →</Link>
      <div style={{display:'flex',gap:14,fontSize:12,color:'#9CA3AF',flexWrap:'wrap',justifyContent:'center'}}>
        <span>✓ クレカ不要</span><span>✓ 7日間無料</span><span>✓ いつでも解約</span>
      </div>
    </div>
  )
}

// ── Sec ───────────────────────────────────────────────────────────────────
function Sec({bg='#fff',children,id}:{bg?:string;children:React.ReactNode;id?:string}) {
  return <section id={id} style={{background:bg,padding:'64px 22px'}}><div style={{maxWidth:820,margin:'0 auto'}}>{children}</div></section>
}

function Badge({children}:{children:React.ReactNode}) {
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(249,115,22,0.1)',border:'1px solid rgba(249,115,22,0.22)',padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:700,color:'#F97316',marginBottom:14}}>{children}</span>
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function LpA() {
  const [sticky,setSticky]=useState(false)
  const [fired,setFired]=useState(false)
  const [scrollY,setScrollY]=useState(0)

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
        .fu{animation:fu 0.6s ease both}
        .fu1{animation-delay:.1s}.fu2{animation-delay:.2s}.fu3{animation-delay:.3s}.fu4{animation-delay:.4s}
        *{box-sizing:border-box;margin:0;padding:0}
        a{text-decoration:none;color:inherit}
        ${LP_FOOTER_CSS}
      `}</style>

      <div style={{fontFamily:"'Hiragino Sans','Noto Sans JP',sans-serif",background:'#fff',color:navy,overflowX:'hidden'}}>

        {/* ── NAV ── */}
        <AppHeader scrollY={scrollY} />
        <div style={{height:72}} />

        {/* ── HERO ── */}
        <section style={{background:'linear-gradient(160deg,#FFFBF5 0%,#fff 60%)',padding:'52px 22px 0'}}>
          <div style={{maxWidth:900,margin:'0 auto'}}>
            <div className="fu" style={{marginBottom:20}}>
              <Badge>🎙️ NativeFlow — 話せる語学トレーニング</Badge>
              <h1 style={{fontSize:'clamp(28px,7.5vw,42px)',fontWeight:900,lineHeight:1.25,letterSpacing:'-0.025em',color:navy,marginBottom:14}}>
                3ヶ月後、<br /><span style={{color:orange}}>世界の人と<br />話せるあなたへ</span>
              </h1>
              <p style={{fontSize:15,lineHeight:1.85,color:gray,marginBottom:10,textAlign:'center',maxWidth:560,margin:'0 auto 10px'}}>毎朝、短時間の会話で、言葉が自然に出てくる。</p>
              <p style={{fontSize:14,color:gray,textAlign:'center',marginBottom:16,opacity:0.9}}>英語・韓国語に対応。今後さらに多言語に拡大予定。</p>
              <div style={{borderLeft:`4px solid ${orange}`,padding:'12px 16px',background:'rgba(249,115,22,0.06)',borderRadius:'0 12px 12px 0',marginBottom:28,fontSize:15,fontWeight:700,color:navy,lineHeight:1.6}}>
                "話す経験が圧倒的に足りない"だけです。
              </div>
              <p style={{fontSize:13,color:gray,textAlign:'center',fontStyle:'italic',marginBottom:16}}>「何年も話せなかったのに、3日で英語で返せました」</p>
              <CTA loc="hero" large />
            </div>

            {/* Hero image — full width below text */}
            <div className="fu fu2" style={{marginTop:32,borderRadius:'20px 20px 0 0',overflow:'hidden',boxShadow:'0 -4px 32px rgba(0,0,0,0.06)'}}>
              <Image
                src="/images/lp/lifestyle/lifestyle-cafe-1.jpg"
                alt="語学を楽しむ女性"
                width={480} height={320}
                style={{width:'100%',height:280,objectFit:'cover',objectPosition:'center top'}}
                priority
              />
            </div>
          </div>
        </section>

        {/* ── EMPATHY ── */}
        <Sec bg="#fff">
          <Badge>😩 あなたもこんな状態では？</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em'}}>
            実はほとんどの人が<br /><span style={{color:orange}}>同じ悩みを持っています</span>
          </h2>
          {[
            {text:'単語も文法もやった'},
            {text:'TOEICの点数もそれなりにある'},
            {text:'でも話せない・・・'},
          ].map((item,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:i===2?'rgba(249,115,22,0.06)':light,borderRadius:12,marginBottom:10,border:i===2?`1px solid rgba(249,115,22,0.2)`:'1px solid rgba(0,0,0,0.06)'}}>
              <span style={{fontSize:18}}>{i===0?'📚':i===1?'📝':'😔'}</span>
              <span style={{fontSize:15,fontWeight:i===2?800:600,color:i===2?orange:navy}}>{item.text}</span>
            </div>
          ))}
          <p style={{marginTop:16,fontSize:14,color:gray,lineHeight:1.8,textAlign:'center'}}>実はほとんどの人が同じです。</p>
        </Sec>

        {/* ── PROBLEM ── */}
        <Sec bg={light}>
          <div style={{background:navy,borderRadius:20,padding:'32px 24px',textAlign:'center',marginBottom:24}}>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.65)',marginBottom:10}}>英語が話せない理由はシンプルです。</p>
            <h2 style={{fontSize:'clamp(24px,7vw,36px)',fontWeight:900,color:'#fff',lineHeight:1.3}}>
              「<span style={{color:'#FB923C'}}>話していない</span>から」
            </h2>
          </div>

          <Badge>⚠️ よくある失敗パターン</Badge>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {icon:'📱',title:'アプリで勉強して満足',sub:'インプットだけでアウトプットがゼロ'},
              {icon:'🎥',title:'動画を見て理解した気になる',sub:'「わかった」と「話せる」は別物'},
              {icon:'💸',title:'英会話教室は料金が高くて続かない',sub:'週1回では圧倒的に練習量が足りない'},
            ].map((item,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:14,padding:'16px 18px',border:'1px solid rgba(0,0,0,0.07)',display:'flex',gap:14,alignItems:'flex-start',boxShadow:'0 1px 6px rgba(0,0,0,0.04)'}}>
                <span style={{fontSize:24}}>{item.icon}</span>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:navy,marginBottom:3}}>{item.title}</div>
                  <div style={{fontSize:12,color:gray}}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:16,background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.2)',borderRadius:12,padding:'14px 16px',textAlign:'center',fontSize:14,fontWeight:800,color:orange}}>
            → どれも"話す回数が足りない"
          </div>
        </Sec>

        {/* ── WHY IT WORKS (A: experience-focused) ── */}
        <Sec bg="#fff">
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em',textAlign:'center'}}>
            気づいたら、<span style={{color:orange}}>話せるようになっている</span>
          </h2>
          <div style={{background:light,borderRadius:16,padding:'32px 24px',textAlign:'center',lineHeight:2.0,fontSize:15,color:navy}}>
            <p style={{margin:'0 0 16px'}}>NativeFlowは、特別なことはしません。</p>
            <p style={{margin:'0 0 16px',fontWeight:700}}>ただ、毎日少し話すだけ。</p>
            <p style={{margin:0}}>それなのに、<br /><span style={{fontWeight:800,color:orange}}>言葉が自然に出てくるようになります。</span></p>
          </div>
        </Sec>

        {/* ── MULTILINGUAL ── */}
        <Sec bg={light}>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em',textAlign:'center'}}>
            世界中の言語で、話せるようになる
          </h2>
          <div style={{background:'#fff',borderRadius:16,padding:'32px 24px',textAlign:'center',lineHeight:2.0,fontSize:15,color:navy,border:'1px solid rgba(0,0,0,0.06)'}}>
            <p style={{margin:'0 0 16px'}}>NativeFlowは、英語・韓国語に対応し、<br />今後さらに多くの言語に対応予定です。</p>
            <p style={{margin:0,fontWeight:700,color:orange}}>どの言語でも、<br />どの言語でも、自然に話せるようになります。</p>
          </div>
        </Sec>

        {/* ── SOLUTION ── */}
        <Sec bg="#fff" id="flow">
          <div style={{background:`linear-gradient(145deg,${navy} 0%,#243566 100%)`,borderRadius:20,padding:'36px 24px',textAlign:'center',boxShadow:`0 12px 40px rgba(27,42,74,0.2)`,marginBottom:28}}>
            <div style={{fontSize:36,marginBottom:14}}>🎙️</div>
            <h2 style={{fontSize:'clamp(18px,5vw,24px)',fontWeight:900,lineHeight:1.45,color:'#fff'}}>
              NativeFlowは<br /><span style={{color:'#FB923C'}}>「話すこと」に特化した</span><br />語学トレーニングです。
            </h2>
          </div>

          <Badge>🔄 学習の流れ</Badge>
          <p style={{fontSize:14,color:gray,marginBottom:16,lineHeight:1.7}}>この流れを毎日繰り返すことで「英語が口から出る状態」を作り上げます。</p>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              {n:'1',t:'聞く',b:'ネイティブの自然な英語を耳で覚える'},
              {n:'2',t:'マネする',b:'発音・フレーズをそのまま繰り返す'},
              {n:'3',t:'話す',b:'AIに向かって実際に声に出す'},
              {n:'4',t:'会話する',b:'AIとリアルな会話で完全定着'},
            ].map((s,i)=>(
              <div key={i}>
                <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:light,borderRadius:12,border:'1px solid rgba(0,0,0,0.06)'}}>
                  <div style={{width:36,height:36,minWidth:36,background:'linear-gradient(135deg,#F97316,#FB923C)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:15}}>{s.n}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:navy,marginBottom:2}}>{s.t}</div>
                    <div style={{fontSize:12,color:gray}}>{s.b}</div>
                  </div>
                </div>
                {i<3&&<div style={{textAlign:'center',color:orange,fontSize:14,fontWeight:700,padding:'3px 0'}}>↓</div>}
              </div>
            ))}
          </div>
        </Sec>

        {/* ── FEATURES ── */}
        <Sec bg={light} id="features">
          <Badge>⚡ NativeFlowの特長</Badge>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {icon:'🌅',t:'日常生活をベースにしてるので覚えやすい',b:'通勤・カフェ・仕事。実際に使う場面で練習するから、すぐ使える。'},
              {icon:'🎧',t:'文字より音中心の学習',b:'聞いて話すことに集中。スキマ時間3分から始められる。'},
              {icon:'🤖',t:'AIとの会話でアウトプット強化',b:'24時間いつでも話せる相手がいる。失敗を恐れず練習できる。'},
              {icon:'🌏',t:'英語・韓国語に対応、さらに拡大予定',b:'現在は英語と韓国語をサポート。今後さらに多くの言語に対応し、世界中の人と話せるプラットフォームを目指しています。'},
            ].map((f,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid rgba(0,0,0,0.07)',display:'flex',gap:14,alignItems:'flex-start',boxShadow:'0 1px 6px rgba(0,0,0,0.04)'}}>
                <div style={{width:44,height:44,minWidth:44,background:'rgba(249,115,22,0.1)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{f.icon}</div>
                <div><div style={{fontSize:14,fontWeight:700,color:navy,marginBottom:4}}>{f.t}</div><div style={{fontSize:12,color:gray,lineHeight:1.7}}>{f.b}</div></div>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── BENEFITS with images ── */}
        <Sec bg="#fff">
          <Badge>✨ 得られること</Badge>
          <h2 style={{fontSize:'clamp(20px,5vw,26px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em'}}>
            NativeFlowで<span style={{color:orange}}>こう変わる</span>
          </h2>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {[
              {img:'/images/lp/hero/hero-after-1.jpg',alt:'英語が自然に出てくる',title:'英語が自然に出てくる',sub:'考えてから話すのではなく、口が勝手に動くようになります。'},
              {img:'/images/lp/scene/scene-beach-1.jpg',alt:'海外で困らなくなる',title:'海外で困らなくなる',sub:'旅行・出張・日常会話。実際の場面で英語が使えるようになります。'},
              {img:'/images/lp/scene/scene-flight-1.jpg',alt:'仕事で使える',title:'仕事で使える',sub:'ビジネスシーンでも自信を持って話せる英語力が身につきます。'},
            ].map((b,i)=>(
              <div key={i} style={{borderRadius:16,overflow:'hidden',border:'1px solid rgba(0,0,0,0.08)',boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
                <Image src={b.img} alt={b.alt} width={480} height={180} style={{width:'100%',height:160,objectFit:'cover'}} />
                <div style={{padding:'14px 16px'}}>
                  <div style={{fontSize:15,fontWeight:800,color:navy,marginBottom:4}}>✦ {b.title}</div>
                  <div style={{fontSize:13,color:gray,lineHeight:1.7}}>{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── TESTIMONIALS ── */}
        <Sec bg={light}>
          <Badge>💬 ユーザーの声</Badge>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {[
              {img:'/images/lp/proof/proof-1.jpg',name:'田中 さん',attr:'28歳・会社員',stars:5,quote:'何年も話せなかったのに、3日目で英語で返せました。AIだから失敗を気にせず話せるのが良かったです。'},
              {img:'/images/lp/proof/proof-2.jpg',name:'鈴木 さん',attr:'32歳・営業職',stars:5,quote:'英会話スクールは高くて続かなかった私でも毎日続けられています。通勤中の5分でも全然違います。'},
              {img:'/images/lp/proof/proof-3.jpg',name:'山田 さん',attr:'35歳・管理職',stars:5,quote:'3ヶ月で海外出張の商談を英語でこなせるようになりました。上司にも驚かれました。'},
            ].map((t,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:16,padding:'20px',border:'1px solid rgba(0,0,0,0.07)',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
                <div style={{display:'flex',gap:2,marginBottom:10}}>{Array.from({length:t.stars}).map((_,j)=><span key={j} style={{color:'#FBBF24',fontSize:14}}>★</span>)}</div>
                <p style={{fontSize:13,lineHeight:1.8,color:'#374151',fontStyle:'italic',borderLeft:`3px solid ${orange}`,paddingLeft:12,marginBottom:14}}>「{t.quote}」</p>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <Image src={t.img} alt={t.name} width={36} height={36} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',objectPosition:'center top'}} />
                  <div><div style={{fontSize:13,fontWeight:700,color:navy}}>{t.name}</div><div style={{fontSize:11,color:gray}}>{t.attr}</div></div>
                </div>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── CTA mid ── */}
        <Sec bg="#fff">
          <CTA loc="mid" />
        </Sec>

        {/* ── TRUST ── */}
        <Sec bg={light}>
          <Badge>🛡️ はじめての方でも安心です</Badge>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {icon:'🎁',t:'無料体験あり',b:'7日間完全無料。クレジットカード不要。'},
              {icon:'🌱',t:'初心者OK',b:'英語が全くできなくても大丈夫。AIがレベルに合わせて調整します。'},
              {icon:'🔓',t:'いつでも解約可能',b:'縛りなし。アプリから1分で解約できます。違約金なし。'},
            ].map((item,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:12,padding:'14px 18px',border:'1px solid rgba(0,0,0,0.07)',display:'flex',alignItems:'center',gap:14}}>
                <span style={{fontSize:24}}>{item.icon}</span>
                <div><div style={{fontSize:14,fontWeight:700,color:navy,marginBottom:2}}>{item.t}</div><div style={{fontSize:12,color:gray}}>{item.b}</div></div>
                <span style={{marginLeft:'auto',color:'#16A34A',fontWeight:800,fontSize:16}}>✓</span>
              </div>
            ))}
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
              {q:'NativeFlowはどんなサービスですか？',a:'AIと会話しながら、日常で使う語学力を身につける学習サービスです。毎日少しずつ話す習慣をつくることで、自然に言葉が口から出るようになることを目指しています。'},
              {q:'英語以外も学べますか？',a:'現在は英語と韓国語に対応しており、今後さらに多くの言語に対応予定です。'},
              {q:'初心者でも使えますか？',a:'はい。レベルに合わせてレッスンが調整されます。まずは7日間無料でお試しいただけます。'},
              {q:'1日どれくらい使えばいいですか？',a:'3〜5分から効果があります。通勤中やお昼休みなど、スキマ時間で十分です。'},
              {q:'7日間無料のあとどうなりますか？',a:'無料期間終了後、ご選択いただいたプランの課金が開始されます。解約はいつでも可能です。'},
              {q:'いつでも解約できますか？',a:'はい。解約はいつでも可能で、解約後も期間満了まではご利用いただけます。'},
              {q:'他の語学アプリと何が違いますか？',a:'NativeFlowは「話す」ことに特化しています。読む・覚えるではなく、AIと実際に会話することで言葉が口から出る状態を作ります。'},
            ].map((item,i)=>(
              <details key={i} style={{background:light,borderRadius:14,border:'1px solid rgba(0,0,0,0.06)',overflow:'hidden'}}>
                <summary style={{padding:'16px 18px',fontSize:14,fontWeight:700,color:navy,cursor:'pointer',listStyle:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  {item.q}
                  <span style={{color:orange,fontSize:18,fontWeight:400,marginLeft:12,flexShrink:0}}>+</span>
                </summary>
                <div style={{padding:'0 18px 16px',fontSize:13,color:gray,lineHeight:1.8}}>
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </Sec>

        {/* ── PRICING ── */}
        <Sec bg={light} id="pricing">
          <Badge>💰 料金プラン</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:8,letterSpacing:'-0.02em'}}>
            シンプルな<span style={{color:orange}}>料金体系</span>
          </h2>
          <p style={{fontSize:14,color:gray,marginBottom:24,lineHeight:1.7}}>まずは7日間無料でお試しください。クレジットカード不要です。</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',border:'1px solid rgba(0,0,0,0.08)',textAlign:'center'}}>
              <div style={{fontSize:13,fontWeight:700,color:gray,marginBottom:8}}>月額プラン</div>
              <div style={{fontSize:32,fontWeight:900,color:navy,marginBottom:4}}>¥2,480<span style={{fontSize:14,fontWeight:600,color:gray}}>/月</span></div>
              <div style={{fontSize:12,color:gray,marginBottom:16}}>いつでも解約OK</div>
              <CTA loc="pricing-monthly" />
            </div>
            <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',border:`2px solid ${orange}`,textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,right:0,background:orange,color:'#fff',fontSize:10,fontWeight:800,padding:'4px 12px',borderRadius:'0 0 0 8px'}}>人気No.1</div>
              <div style={{fontSize:13,fontWeight:700,color:orange,marginBottom:8}}>年額プラン</div>
              <div style={{fontSize:32,fontWeight:900,color:navy,marginBottom:4}}>¥19,800<span style={{fontSize:14,fontWeight:600,color:gray}}>/年</span></div>
              <div style={{fontSize:14,fontWeight:700,color:orange,marginBottom:4}}>1日たった約55円</div>
              <div style={{fontSize:12,fontWeight:700,color:'#16A34A',marginBottom:16}}>年間で約10,000円お得</div>
              <CTA loc="pricing-yearly" />
            </div>
          </div>
        </Sec>

        {/* ── CLOSING ── */}
        <section style={{background:navy,padding:'72px 22px',textAlign:'center'}}>
          <div style={{maxWidth:820,margin:'0 auto'}}>
            <div style={{fontSize:44,marginBottom:20}}>🚀</div>
            <h2 style={{fontSize:'clamp(22px,6vw,34px)',fontWeight:900,color:'#fff',lineHeight:1.3,marginBottom:12,letterSpacing:'-0.02em'}}>
              英語は「勉強」ではなく<br /><span style={{color:'#FB923C'}}>「経験」</span>です。
            </h2>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.7)',marginBottom:32,lineHeight:1.8}}>今すぐ、話し始めてください。</p>
            <CTA label="無料ではじめる" loc="final" large />
            <p style={{marginTop:20,fontSize:13,color:'rgba(255,255,255,0.5)'}}>
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" style={{color:'#FB923C',fontWeight:700}}>ログイン</Link>
            </p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <AppFooter />

        {/* ── STICKY CTA ── */}
        <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:300,background:'rgba(255,255,255,0.96)',backdropFilter:'blur(10px)',borderTop:'1px solid rgba(0,0,0,0.08)',padding:'12px 20px',transform:sticky?'translateY(0)':'translateY(100%)',transition:'transform 0.3s cubic-bezier(0.4,0,0.2,1)'}}>
          <Link href="/signup" onClick={()=>track('cta_click',{location:'sticky'})} style={{display:'block',textAlign:'center',background:'linear-gradient(135deg,#F97316,#FB923C)',color:'#fff',fontSize:16,fontWeight:800,padding:'15px',borderRadius:100,textDecoration:'none',boxShadow:'0 4px 16px rgba(249,115,22,0.35)',fontFamily:'inherit'}}>無料ではじめる →</Link>
        </div>
        <div style={{height:sticky?76:0,transition:'height 0.3s ease'}} />
      </div>
    </>
  )
}

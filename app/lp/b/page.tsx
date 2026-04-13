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
function CTA({ label='無料ではじめる', loc='inline', large=false }:{label?:string;loc?:string;large?:boolean}) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
      <p style={{fontSize:14,fontWeight:600,color:'#1B2A4A',opacity:0.7,textAlign:'center',marginBottom:4}}>話せる自分に変わるなら、始めるのは今です。</p>
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

function Sec({bg='#fff',children,id}:{bg?:string;children:React.ReactNode;id?:string}) {
  return <section id={id} style={{background:bg,padding:'64px 22px'}}><div style={{maxWidth:820,margin:'0 auto'}}>{children}</div></section>
}

function Badge({children}:{children:React.ReactNode}) {
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(249,115,22,0.1)',border:'1px solid rgba(249,115,22,0.22)',padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:700,color:'#F97316',marginBottom:14}}>{children}</span>
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function LpB() {
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
        .fu1{animation-delay:.1s}.fu2{animation-delay:.2s}.fu3{animation-delay:.3s}
        *{box-sizing:border-box;margin:0;padding:0}
        a{text-decoration:none;color:inherit}
        ${LP_FOOTER_CSS}
      `}</style>

      <div style={{fontFamily:"'Hiragino Sans','Noto Sans JP',sans-serif",background:'#fff',color:navy,overflowX:'hidden'}}>

        {/* ── NAV ── */}
        <AppHeader scrollY={scrollY} />
        <div style={{height:72}} />

        {/* ── HERO ── full-height, 2-col on desktop ── */}
        <section style={{background:'linear-gradient(160deg,#FFFBF5 0%,#fff 60%)',minHeight:'calc(100vh - 72px)',display:'flex',flexDirection:'column',justifyContent:'flex-start',padding:'64px 22px 40px'}}>
          <div style={{maxWidth:1140,margin:'0 auto',width:'100%',display:'flex',flexWrap:'wrap',alignItems:'center',gap:48,justifyContent:'center'}}>
            {/* Left — text + CTA */}
            <div style={{flex:'1 1 360px',minWidth:280,maxWidth:560,paddingLeft:56}}>
              <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(249,115,22,0.1)',border:'1px solid rgba(249,115,22,0.22)',padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:700,color:orange,marginBottom:16}}>
                🎙️ 話すための語学トレーニング
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
              <CTA loc="hero" large />
              <p style={{marginTop:14,fontSize:13,color:gray,textAlign:'center',fontStyle:'italic'}}>1ヶ月ほどで、話しやすさの変化を実感する人が多くいます。</p>
            </div>
            {/* Right — hero image with conversation hint */}
            <div style={{flex:'1 1 340px',display:'flex',justifyContent:'center',position:'relative',marginRight:48}}>
              <Image
                src="/images/lp/hero/hero-after-1.jpg"
                alt="自信を持って話す女性"
                width={840} height={840}
                style={{width:'100%',maxWidth:420,height:'auto',borderRadius:20}}
                priority
              />
              {/* Speech bubble overlay — English (primary) */}
              <div style={{position:'absolute',top:24,right:0,display:'flex',flexDirection:'column',gap:8,maxWidth:200}}>
                <div style={{background:'#fff',borderRadius:'16px 16px 4px 16px',padding:'10px 16px',boxShadow:'0 4px 16px rgba(0,0,0,0.1)',alignSelf:'flex-end'}}>
                  <p style={{fontSize:13,fontWeight:600,color:navy,lineHeight:1.5,margin:0}}>Hi! How was your day?</p>
                </div>
                <div style={{background:orange,borderRadius:'16px 16px 16px 4px',padding:'10px 16px',boxShadow:'0 4px 16px rgba(249,115,22,0.2)',alignSelf:'flex-start'}}>
                  <p style={{fontSize:13,fontWeight:600,color:'#fff',lineHeight:1.5,margin:0}}>It was good, thanks!</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── EMPATHY ── */}
        <section style={{background:light,padding:'64px 22px'}}>
          <div style={{maxWidth:1140,margin:'0 auto',padding:'0 24px'}}>
            {/* Text block — centered narrow */}
            <div style={{maxWidth:720,margin:'0 auto',textAlign:'center'}}>
              <Badge>😔 こんな経験ありませんか？</Badge>
              <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:16,letterSpacing:'-0.02em'}}>
                ずっと英語を勉強しているのに<br />いざ話そうとすると<span style={{color:orange}}>何も出てこない</span>
              </h2>
              <p style={{fontSize:14,color:gray,lineHeight:1.85,marginBottom:12}}>これ、あなたも経験ありませんか？</p>
              <p style={{fontSize:15,fontWeight:700,color:orange,lineHeight:1.7,marginBottom:20}}>英語で話しかけられた瞬間、頭が真っ白になる</p>
            </div>

            {/* Empathy image — centered */}
            <div style={{width:'100%',maxWidth:720,margin:'0 auto 12px',position:'relative',aspectRatio:'16 / 9',borderRadius:16,overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}}>
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
            <h2 style={{fontSize:'clamp(22px,6vw,32px)',fontWeight:900,color:navy,lineHeight:1.3,marginBottom:16}}>
              "<span style={{color:orange}}>話す練習不足</span>"です。
            </h2>
            <p style={{fontSize:14,color:gray,lineHeight:1.8}}>どれだけ知識があっても、話す練習なしには話せるようになりません。</p>
          </div>
        </Sec>

        {/* ── WHY IT WORKS (B: mystery + trust) ── */}
        <Sec bg="#fff">
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em',textAlign:'center'}}>
            なぜか、<span style={{color:orange}}>話せるようになる</span>
          </h2>
          <div style={{background:light,borderRadius:16,padding:'32px 24px',textAlign:'center',lineHeight:2.0,fontSize:15,color:navy}}>
            <p style={{margin:'0 0 16px'}}>NativeFlowのレッスンは、<br />多くの人が自然に話せるようになる流れで設計されています。</p>
            <p style={{margin:'0 0 16px',fontWeight:700}}>やることはシンプル。</p>
            <p style={{margin:0}}>でも、<br /><span style={{fontWeight:800,color:orange}}>続けると確実に変化が出ます。</span></p>
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

        {/* ── NEW LEARNING ── */}
        <Sec bg={light}>
          <Badge>💡 新しい学習法</Badge>
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:12,alignItems:'center',marginBottom:20}}>
            <div style={{background:'#FFF5F5',border:'1px solid #FECACA',borderRadius:14,padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#DC2626',marginBottom:6}}>これまで</div>
              <div style={{fontSize:14,fontWeight:700,color:navy}}>覚える英語</div>
            </div>
            <div style={{color:orange,fontWeight:900,fontSize:20,textAlign:'center'}}>→</div>
            <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:14,padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#16A34A',marginBottom:6}}>NativeFlow</div>
              <div style={{fontSize:14,fontWeight:700,color:navy}}>使う英語</div>
            </div>
          </div>
          <div style={{background:navy,borderRadius:16,padding:'20px',textAlign:'center'}}>
            <h3 style={{fontSize:16,fontWeight:800,color:'#fff',lineHeight:1.5}}>
              NativeFlowは<br /><span style={{color:'#FB923C'}}>「使える英語」</span>を脳に構築します。
            </h3>
          </div>
        </Sec>

        {/* ── DAILY SCENES ── */}
        <Sec bg="#fff">
          <Badge>🌅 体験イメージ</Badge>
          <h2 style={{fontSize:'clamp(20px,5vw,26px)',fontWeight:900,lineHeight:1.4,marginBottom:16,letterSpacing:'-0.02em'}}>
            日常シーンの中で<br /><span style={{color:orange}}>英語を自然に使えるように</span>なります
          </h2>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {img:'/images/lp/lifestyle/lifestyle-home-1.jpg',label:'🌅 朝起きる',desc:'起き上がってすぐ3分間のAI会話から始まる朝'},
              {img:'/images/lp/lifestyle/lifestyle-cafe-1.jpg',label:'☕ 友達と話す',desc:'カフェで友人に英語で話しかけられても余裕'},
              {img:'/images/lp/scene/scene-cafe-1.jpg',label:'🛒 買い物する',desc:'海外のお店でも自然に英語でやり取りできる'},
            ].map((s,i)=>(
              <div key={i} style={{borderRadius:14,overflow:'hidden',border:'1px solid rgba(0,0,0,0.07)',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
                <Image src={s.img} alt={s.label} width={480} height={160} style={{width:'100%',height:140,objectFit:'cover',objectPosition:'center'}} />
                <div style={{padding:'12px 14px',background:'#fff',display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:14,fontWeight:800,color:navy}}>{s.label}</span>
                  <span style={{fontSize:12,color:gray}}>{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── HOW IT WORKS ── */}
        <Sec bg={light} id="flow">
          <Badge>🔄 学習サイクル</Badge>
          <h2 style={{fontSize:'clamp(18px,5vw,24px)',fontWeight:900,lineHeight:1.4,marginBottom:6,letterSpacing:'-0.02em'}}>
            このサイクルで<span style={{color:orange}}>「英語脳」</span>を作り上げます
          </h2>
          <p style={{fontSize:13,color:gray,marginBottom:20}}>毎日続けることで、考えなくても口から英語が出てくる状態になります。</p>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fff',borderRadius:16,padding:'20px',border:'1px solid rgba(0,0,0,0.07)',marginBottom:20}}>
            {[
              {n:'聞く',sub:'耳で覚える'},
              {n:'リピート',sub:'真似る'},
              {n:'会話',sub:'実践する'},
              {n:'定着',sub:'使えるに'},
            ].map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
                <div style={{textAlign:'center'}}>
                  <div style={{width:32,height:32,background:'linear-gradient(135deg,#F97316,#FB923C)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 5px',color:'#fff',fontWeight:800,fontSize:10}}>{i+1}</div>
                  <div style={{fontSize:12,fontWeight:800,color:navy}}>{s.n}</div>
                  <div style={{fontSize:10,color:gray}}>{s.sub}</div>
                </div>
                {i<3&&<div style={{color:orange,fontWeight:700,fontSize:14,marginBottom:14,marginLeft:2,marginRight:2}}>→</div>}
              </div>
            ))}
          </div>

          <Badge>✦ 他との違い</Badge>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {icon:'🎧',t:'文字中心ではなく音中心',b:'聞いて話す練習に集中。読む負担ゼロ。'},
              {icon:'🤖',t:'AIと話してアウトプット',b:'24時間失敗を恐れずに練習できる相手がいる。'},
              {icon:'🎯',t:'1文ずつしっかり身につけていく',b:'曖昧な理解ではなく、使える状態まで定着させる。'},
            ].map((f,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(0,0,0,0.07)',display:'flex',gap:12,alignItems:'flex-start'}}>
                <span style={{fontSize:20}}>{f.icon}</span>
                <div><div style={{fontSize:13,fontWeight:700,color:navy,marginBottom:2}}>{f.t}</div><div style={{fontSize:12,color:gray}}>{f.b}</div></div>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── BENEFITS ── */}
        <Sec bg="#fff">
          <Badge>🌟 こう変わる</Badge>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {icon:'💬',t:'考えずに話せる',b:'口が勝手に動く状態。会話の「間」が怖くなくなります。'},
              {icon:'🤝',t:'スムーズに会話できる',b:'海外の方とも自然なテンポでやりとりできるように。'},
              {icon:'🌏',t:'語学で世界が変わる',b:'英語が話せることで、人生の選択肢が広がります。'},
            ].map((b,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'18px',background:light,borderRadius:14,border:'1px solid rgba(0,0,0,0.06)'}}>
                <div style={{width:48,height:48,minWidth:48,background:'rgba(249,115,22,0.1)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>{b.icon}</div>
                <div><div style={{fontSize:15,fontWeight:800,color:navy,marginBottom:4}}>{b.t}</div><div style={{fontSize:13,color:gray,lineHeight:1.65}}>{b.b}</div></div>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── CTA mid ── */}
        <Sec bg={light}>
          <CTA loc="mid" label="無料ではじめる" />
        </Sec>

        {/* ── TESTIMONIALS ── */}
        <Sec bg="#fff">
          <Badge>💬 実際に変わった体験談</Badge>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {[
              {img:'/images/lp/avatar/avatar-user-1.jpg',name:'中村 さん',attr:'26歳・会社員',stars:5,quote:'ずっと話せなかったのに3日で変化を感じました。毎日5分でも全然違います。'},
              {img:'/images/lp/avatar/avatar-user-2.jpg',name:'佐藤 さん',attr:'31歳・マーケター',stars:5,quote:'英会話スクールは続かなかった私でも毎日続けられています。スキマ時間でできるのが大きいです。'},
              {img:'/images/lp/proof/proof-4.jpg',name:'木村 さん',attr:'38歳・営業マネージャー',stars:5,quote:'海外クライアントとの会議が怖くなくなりました。自然に言葉が出てくるようになって驚いています。'},
            ].map((t,i)=>(
              <div key={i} style={{background:light,borderRadius:16,padding:'20px',border:'1px solid rgba(0,0,0,0.07)'}}>
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

        {/* ── TRUST ── */}
        <Sec bg={light}>
          <Badge>🛡️ 安心ポイント</Badge>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {icon:'🆓',t:'無料スタート',b:'7日間完全無料。クレジットカード不要で始められます。'},
              {icon:'🌱',t:'初心者でもOK',b:'英語ゼロの状態でも大丈夫。AIがレベルに合わせます。'},
              {icon:'⏱️',t:'スキマ時間でできる',b:'1日3〜5分から。通勤中・昼休み・寝る前にも。'},
            ].map((item,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:12,padding:'14px 18px',border:'1px solid rgba(0,0,0,0.07)',display:'flex',alignItems:'center',gap:14}}>
                <span style={{fontSize:24}}>{item.icon}</span>
                <div><div style={{fontSize:14,fontWeight:700,color:navy,marginBottom:2}}>{item.t}</div><div style={{fontSize:12,color:gray}}>{item.b}</div></div>
                <span style={{marginLeft:'auto',color:'#16A34A',fontWeight:800,fontSize:16}}>✓</span>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── FREE EXPERIENCE ── */}
        <Sec bg="#fff">
          <Badge>🎁 無料で体験できます</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:16,letterSpacing:'-0.02em'}}>
            7日間、<span style={{color:orange}}>全機能を無料</span>で試せます
          </h2>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {icon:'🎙️',t:'AI会話レッスン',b:'好きなシーンを選んで、AIと英語で会話できます。'},
              {icon:'🧠',t:'SRS復習',b:'覚えたフレーズを忘れる直前に自動で復習。記憶が定着します。'},
              {icon:'📊',t:'学習レポート',b:'毎日の進捗が数字で見える。成長を実感できます。'},
            ].map((item,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:14,padding:'16px 18px',background:light,borderRadius:14,border:'1px solid rgba(0,0,0,0.06)'}}>
                <span style={{fontSize:24}}>{item.icon}</span>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:navy,marginBottom:3}}>{item.t}</div>
                  <div style={{fontSize:12,color:gray,lineHeight:1.7}}>{item.b}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:24}}>
            <CTA loc="free-experience" />
          </div>
        </Sec>

        {/* ── FEATURES ── */}
        <Sec bg={light} id="features">
          <Badge>⚡ NativeFlowの特長</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em'}}>
            他の語学学習と<span style={{color:orange}}>ここが違います</span>
          </h2>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {icon:'🌅',t:'日常生活がそのまま教材',b:'朝・通勤・カフェ・仕事——あなたの1日に沿ったシーンで練習するから、明日からすぐ使えます。'},
              {icon:'🎧',t:'文字ではなく「音」中心',b:'聞いて話すことに集中。読む負担ゼロ。スキマ時間3分から始められます。'},
              {icon:'🤖',t:'AIが24時間練習相手',b:'いつでもどこでも話せる相手がいる。失敗しても恥ずかしくない。だから続けられる。'},
              {icon:'🧠',t:'自然に定着する復習設計',b:'忘れかけたタイミングで、自然に復習。一度覚えた表現を確実に「使える」レベルまで定着させます。'},
              {icon:'🎯',t:'あなただけのカリキュラム',b:'目標・レベル・生活スタイルに合わせてAIが最適なレッスンを毎日生成します。'},
              {icon:'🌏',t:'英語・韓国語に対応、さらに拡大予定',b:'現在は英語と韓国語をサポート。今後さらに多くの言語に対応し、世界中の人と話せるプラットフォームを目指しています。'},
            ].map((f,i)=>(
              <div key={i} style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:'1px solid rgba(0,0,0,0.07)',display:'flex',gap:14,alignItems:'flex-start',boxShadow:'0 1px 6px rgba(0,0,0,0.04)'}}>
                <div style={{width:44,height:44,minWidth:44,background:'rgba(249,115,22,0.1)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{f.icon}</div>
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
          <Badge>👤 こんな方におすすめ</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em'}}>
            NativeFlowが<span style={{color:orange}}>最適な方</span>
          </h2>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              '英語の知識はあるのに、口から出てこない方',
              '英会話教室は高くて続かなかった方',
              '仕事で英語が必要になった方',
              '海外旅行で自然に話したい方',
              '毎日忙しくて、まとまった学習時間が取れない方',
              '人前で英語を話すのが恥ずかしい方',
            ].map((text,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:light,borderRadius:12,border:'1px solid rgba(0,0,0,0.06)'}}>
                <span style={{color:'#16A34A',fontWeight:800,fontSize:16}}>✓</span>
                <span style={{fontSize:14,fontWeight:600,color:navy}}>{text}</span>
              </div>
            ))}
          </div>
        </Sec>

        {/* ── COMPARISON ── */}
        <Sec bg={light}>
          <Badge>📊 比較</Badge>
          <h2 style={{fontSize:'clamp(20px,5.5vw,28px)',fontWeight:900,lineHeight:1.4,marginBottom:20,letterSpacing:'-0.02em'}}>
            他の学習方法との<span style={{color:orange}}>違い</span>
          </h2>
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:500}}>
              <thead>
                <tr style={{borderBottom:`2px solid ${orange}`}}>
                  <th style={{textAlign:'left',padding:'12px 10px',fontWeight:800,color:navy}}></th>
                  <th style={{textAlign:'center',padding:'12px 10px',fontWeight:800,color:orange,background:'rgba(249,115,22,0.06)',borderRadius:'8px 8px 0 0'}}>NativeFlow</th>
                  <th style={{textAlign:'center',padding:'12px 10px',fontWeight:700,color:gray}}>英会話教室</th>
                  <th style={{textAlign:'center',padding:'12px 10px',fontWeight:700,color:gray}}>学習アプリ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {label:'話す練習量',nf:'◎ 毎日',school:'△ 週1回',app:'✕ ほぼなし'},
                  {label:'料金',nf:'◎ 月額2,480円〜',school:'✕ 月2〜5万円',app:'○ 無料〜'},
                  {label:'時間の自由度',nf:'◎ 24時間',school:'△ 予約制',app:'◎ いつでも'},
                  {label:'アウトプット',nf:'◎ 会話中心',school:'○ 講師と会話',app:'✕ 読む中心'},
                  {label:'恥ずかしさ',nf:'◎ AIだからゼロ',school:'△ 人前で緊張',app:'○ ない'},
                  {label:'記憶定着',nf:'◎ SRS搭載',school:'△ 自己管理',app:'△ 一部あり'},
                ].map((row,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
                    <td style={{padding:'12px 10px',fontWeight:700,color:navy}}>{row.label}</td>
                    <td style={{padding:'12px 10px',textAlign:'center',fontWeight:700,color:navy,background:'rgba(249,115,22,0.03)'}}>{row.nf}</td>
                    <td style={{padding:'12px 10px',textAlign:'center',color:gray}}>{row.school}</td>
                    <td style={{padding:'12px 10px',textAlign:'center',color:gray}}>{row.app}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            {/* Monthly */}
            <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',border:'1px solid rgba(0,0,0,0.08)',textAlign:'center'}}>
              <div style={{fontSize:13,fontWeight:700,color:gray,marginBottom:8}}>月額プラン</div>
              <div style={{fontSize:32,fontWeight:900,color:navy,marginBottom:4}}>¥2,480<span style={{fontSize:14,fontWeight:600,color:gray}}>/月</span></div>
              <div style={{fontSize:12,color:gray,marginBottom:16}}>いつでも解約OK</div>
              <CTA loc="pricing-monthly" label="無料ではじめる" />
            </div>
            {/* Yearly */}
            <div style={{background:'#fff',borderRadius:16,padding:'24px 20px',border:`2px solid ${orange}`,textAlign:'center',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,right:0,background:orange,color:'#fff',fontSize:10,fontWeight:800,padding:'4px 12px',borderRadius:'0 0 0 8px'}}>人気No.1</div>
              <div style={{fontSize:13,fontWeight:700,color:orange,marginBottom:8}}>年額プラン</div>
              <div style={{fontSize:32,fontWeight:900,color:navy,marginBottom:4}}>¥19,800<span style={{fontSize:14,fontWeight:600,color:gray}}>/年</span></div>
              <div style={{fontSize:14,fontWeight:700,color:orange,marginBottom:4}}>1日たった約55円</div>
              <div style={{fontSize:12,fontWeight:700,color:'#16A34A',marginBottom:16}}>年間で約10,000円お得</div>
              <CTA loc="pricing-yearly" label="無料ではじめる" />
            </div>
          </div>
        </Sec>

        {/* ── CLOSING ── */}
        <section style={{background:navy,padding:'72px 22px',textAlign:'center'}}>
          <div style={{maxWidth:820,margin:'0 auto'}}>
            {/* Closing image */}
            <div style={{borderRadius:16,overflow:'hidden',marginBottom:28,boxShadow:'0 8px 24px rgba(0,0,0,0.2)'}}>
              <Image src="/images/lp/proof/proof-4.jpg" alt="英語で自信を持って話す" width={480} height={200} style={{width:'100%',height:180,objectFit:'cover',objectPosition:'center top'}} />
            </div>
            <h2 style={{fontSize:'clamp(20px,5.5vw,30px)',fontWeight:900,color:'#fff',lineHeight:1.35,marginBottom:12,letterSpacing:'-0.02em'}}>
              今この瞬間から、<br /><span style={{color:'#FB923C'}}>「話せる側」</span>に<br />変わってください。
            </h2>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.75)',marginBottom:32,lineHeight:1.8}}>
              「自然と話せる英語」を手に入れてください。
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

        {/* ── STICKY CTA ── */}
        <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:300,background:'rgba(255,255,255,0.96)',backdropFilter:'blur(10px)',borderTop:'1px solid rgba(0,0,0,0.08)',padding:'12px 20px',transform:sticky?'translateY(0)':'translateY(100%)',transition:'transform 0.3s cubic-bezier(0.4,0,0.2,1)'}}>
          <Link href="/signup" onClick={()=>track('cta_click',{location:'sticky'})} style={{display:'block',textAlign:'center',background:'linear-gradient(135deg,#F97316,#FB923C)',color:'#fff',fontSize:16,fontWeight:800,padding:'15px',borderRadius:100,textDecoration:'none',boxShadow:'0 4px 16px rgba(249,115,22,0.35)',fontFamily:'inherit'}}>無料ではじめる →</Link>
        </div>
        <div style={{height:sticky?76:0,transition:'height 0.3s ease'}} />
      </div>
    </>
  )
}

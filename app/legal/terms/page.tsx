import type { CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const C = {
  dark: '#1a1a2e',
  mid: '#4a4a6a',
  light: '#f7f4ef',
  white: '#ffffff',
  border: '#ede9e2',
} as const

const containerStyle: CSSProperties = {
  background: C.white,
  borderRadius: 20,
  padding: '32px 40px',
  boxShadow: '0 2px 16px rgba(0,0,0,.05)',
  border: `1.5px solid ${C.border}`,
}

const pageWrapStyle: CSSProperties = {
  fontFamily: "'Nunito','Hiragino Sans',sans-serif",
  background: C.light,
  color: C.dark,
  minHeight: '100vh',
}

const navStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 300,
  background: C.white,
  borderBottom: `1px solid ${C.border}`,
  padding: '0 40px',
}

const navInnerStyle: CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  height: 72,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const logoLinkStyle: CSSProperties = { display: 'flex', alignItems: 'center', textDecoration: 'none' }
const logoImgStyle: CSSProperties = { height: 44, width: 'auto' }
const navDateStyle: CSSProperties = { fontSize: 12, color: C.mid, fontWeight: 600 }

const headerStyle: CSSProperties = {
  background: `linear-gradient(160deg, ${C.white} 55%, #fff8f2 100%)`,
  borderBottom: `1px solid ${C.border}`,
  padding: '56px 40px 48px',
}

const heroInnerStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', textAlign: 'center' }

const mainStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '40px 40px 80px' }
const sectionStyle: CSSProperties = { marginBottom: 28 }
const sectionStyleLast: CSSProperties = { marginBottom: 0 }
const sectionTitleStyle: CSSProperties = { fontSize: 17, fontWeight: 800, color: C.dark, marginBottom: 12, letterSpacing: '-.2px' }
const sectionBodyStyle: CSSProperties = { fontSize: 14, color: C.mid, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }

const footerWrapStyle: CSSProperties = {
  borderTop: `1px solid ${C.border}`,
  padding: '40px',
  background: C.white,
}

const footerGridStyle: CSSProperties = {
  maxWidth: 1140,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr 1fr',
  gap: 40,
}

const footerLogoWrapStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }
const footerLogoImgStyle: CSSProperties = { height: 40, width: 'auto' }
const footerTaglineStyle: CSSProperties = { fontSize: 13, color: '#aaa', lineHeight: 1.7, maxWidth: 240 }
const footerColTitleStyle: CSSProperties = { fontWeight: 800, fontSize: 14, marginBottom: 14, color: C.dark }
const footerLinkStyle: CSSProperties = { display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 8 }

const footerBottomStyle: CSSProperties = {
  maxWidth: 1140,
  margin: '28px auto 0',
  paddingTop: 24,
  borderTop: `1px solid ${C.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const footerBottomPStyle: CSSProperties = { fontSize: 13, color: '#bbb' }
const footerBottomP2Style: CSSProperties = { fontSize: 12, color: '#bbb' }

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '第1条（適用）',
    body: '本利用規約（以下「本規約」）は、株式会社Marswift（以下「当社」）が提供するAI語学学習サービス「NativeFlow」（usenativeflow.com、以下「本サービス」）の利用に関する条件を定めるものです。\n\nユーザーは本規約に同意した上で本サービスを利用するものとし、本サービスの利用をもって本規約に同意したものとみなします。',
  },
  {
    title: '第2条（利用登録）',
    body: '本サービスの利用を希望する方は、当社の定める方法により利用登録を申請し、当社がこれを承認することで利用登録が完了します。\n\n当社は、以下の場合に利用登録を拒否することがあります。\n・虚偽の情報で登録申請した場合。\n・過去に本規約違反があった場合。\n・13歳未満の方。\n・その他当社が不適切と判断した場合。',
  },
  {
    title: '第3条（アカウント管理）',
    body: 'ユーザーは、自己の責任においてパスワードおよびアカウント情報を管理するものとします。\n・パスワードを第三者に開示・共有しないこと。\n・不正利用が発覚した場合は直ちに当社に通知すること。\n・1アカウントは1名での利用を原則とします。\n・アカウントの第三者への譲渡・売買を禁止します。',
  },
  {
    title: '第4条（AIコンテンツの利用）',
    body: '本サービスではOpenAI APIを活用したAI会話機能を提供します。\n・AIの生成内容は必ずしも正確・完全ではありません。\n・AIとの会話内容は学習改善・サービス向上に利用される場合があります。\n・AIが生成したコンテンツの著作権については当社が定める範囲で利用できます。\n・AIを利用した不正行為・悪用は禁止します。',
  },
  {
    title: '第5条（禁止事項）',
    body: 'ユーザーは以下の行為を行ってはなりません。\n\n法令違反・犯罪行為：\n法令に違反する行為、犯罪行為に関連する行為。\n\n不正アクセス：\n当社のサーバー・ネットワークへの不正アクセス・妨害行為。\n\n知的財産権の侵害：\n当社または第三者の著作権・商標権・特許権等の侵害。\n\n迷惑行為：\n他のユーザーや第三者への嫌がらせ・誹謗中傷。\n\n商業目的の無断利用：\n当社の許可なくサービスを商業目的で利用すること。\n\nリバースエンジニアリング：\n本サービスを解析・改ざん・複製する行為。\n\n虚偽情報の登録：\n虚偽の情報でアカウントを登録・使用する行為。',
  },
  {
    title: '第6条（知的財産権）',
    body: '本サービスのコンテンツ（テキスト・画像・音声・プログラム等）に関する著作権その他の知的財産権は、当社または正当な権利者に帰属します。\n\nユーザーが本サービスを通じて作成した学習データ・会話ログについては、ユーザー自身の情報として取り扱います。ただし、当社はサービス改善のために匿名化した形で利用することができます。',
  },
  {
    title: '第7条（免責事項）',
    body: '当社は以下について責任を負いません。\n・本サービスの利用によって生じた損害（直接・間接を問わず）。\n・AIが生成したコンテンツの正確性・完全性。\n・通信障害・システム障害によるサービスの中断・停止。\n・ユーザー間または第三者との間で生じたトラブル。\n・インターネット接続環境に起因する問題。\n\n当社の故意または重大な過失による場合を除き、当社の賠償責任は月額料金を上限とします。',
  },
  {
    title: '第8条（サービスの変更・終了）',
    body: '当社は、事前の通知なくサービスの内容を変更・追加・削除することがあります。\n\nサービスを終了する場合は、30日以上前にメールおよびサービス内でお知らせします。サービス終了に伴う未消化分の返金については、別途定める返金ポリシーに従います。',
  },
  {
    title: '第9条（規約の変更）',
    body: '当社は、必要と判断した場合に本規約を変更できるものとします。重要な変更の場合は、メールまたはサービス内の通知にてお知らせします。\n\n変更後の規約はサービス内に掲示した時点から効力を生じ、変更後も本サービスをご利用いただいた場合、変更後の規約に同意いただいたものとみなします。',
  },
  {
    title: '第10条（準拠法・管轄裁判所）',
    body: '本規約の解釈は日本法に準拠します。\n\n本サービスに関連して生じた紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。',
  },
  {
    title: '第11条（お問い合わせ）',
    body: '事業者名：株式会社Marswift\n代表者：石田 昌宏\n所在地：東京都板橋区中台1-23-5\nメール：info@usenativeflow.com\n制定日：2026年3月11日\n最終更新日：2026年3月11日',
  },
]

export default function TermsPage() {
  return (
    <div style={pageWrapStyle}>
      <style>{`
        .legal-title { font-size: 36px; font-weight: 900; color: #1a1a2e; margin-bottom: 0; letter-spacing: -0.5px; line-height: 1.2; }
        .lp-footer-bottom { flex-wrap: wrap; }
        .legal-logo-link:hover { opacity: 0.85; }
        .legal-logo-link:focus-visible { outline: 2px solid #ede9e2; outline-offset: 2px; border-radius: 4px; }
        .legal-footer-link { transition: color 0.15s ease; }
        .legal-footer-link:hover { color: #5c5c5c; }
        .legal-footer-link:focus-visible { outline: 2px solid #ede9e2; outline-offset: 2px; border-radius: 2px; }
        @media (max-width: 768px) {
          .legal-nav { padding-left: 24px !important; padding-right: 24px !important; }
          .legal-hero-wrap { padding: 40px 24px 36px !important; }
          .legal-title { font-size: 28px !important; }
          .legal-main { padding: 32px 24px 64px !important; }
          .legal-content-box { padding: 24px 20px !important; }
          .lp-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
          .legal-footer-wrap { padding: 32px 24px !important; }
          .lp-footer-bottom { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }
        @media (max-width: 480px) {
          .lp-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <nav className="legal-nav" style={navStyle}>
        <div style={navInnerStyle}>
          <Link href="/" style={logoLinkStyle} className="legal-logo-link">
            <Image src="/header_logo.svg" alt="NativeFlow" width={200} height={48} style={logoImgStyle} />
          </Link>
          <span style={navDateStyle}>最終更新日：2026年3月11日</span>
        </div>
      </nav>

      <header className="legal-hero-wrap" style={headerStyle}>
        <div style={heroInnerStyle}>
          <h1 className="legal-title">
            利用規約
          </h1>
        </div>
      </header>

      <div className="legal-main" style={mainStyle}>
        <div className="legal-content-box" style={containerStyle}>
          {SECTIONS.map(({ title, body }, index) => (
            <section key={title} style={index < SECTIONS.length - 1 ? sectionStyle : sectionStyleLast}>
              <h2 style={sectionTitleStyle}>{title}</h2>
              <p style={sectionBodyStyle}>{body}</p>
            </section>
          ))}
        </div>
      </div>

      <footer className="lp-footer legal-footer-wrap" style={footerWrapStyle}>
        <div className="lp-footer-grid" style={footerGridStyle}>
          <div>
            <div style={footerLogoWrapStyle}>
              <Link href="/" style={logoLinkStyle} className="legal-logo-link">
                <Image src="/footer_logo.svg" alt="NativeFlow" width={200} height={40} className="lp-logo-footer" style={footerLogoImgStyle} />
              </Link>
            </div>
            <p style={footerTaglineStyle}>Speak with AI. Learn like a native.</p>
          </div>
          <div>
            <div style={footerColTitleStyle}>プロダクト</div>
            <Link href="/#features" style={footerLinkStyle} className="legal-footer-link">特徴</Link>
            <Link href="/#scenes" style={footerLinkStyle} className="legal-footer-link">学習方法</Link>
            <Link href="/#pricing" style={footerLinkStyle} className="legal-footer-link">料金プラン</Link>
            <Link href="/#faq" style={footerLinkStyle} className="legal-footer-link">よくある質問</Link>
          </div>
          <div>
            <div style={footerColTitleStyle}>法的情報</div>
            <Link href="/legal/privacy" style={footerLinkStyle} className="legal-footer-link">プライバシーポリシー</Link>
            <Link href="/legal/terms" style={footerLinkStyle} className="legal-footer-link">利用規約</Link>
            <Link href="/legal/tokusho" style={footerLinkStyle} className="legal-footer-link">特定商取引法に基づく表記</Link>
            <Link href="/legal/company" style={footerLinkStyle} className="legal-footer-link">会社情報</Link>
          </div>
          <div>
            <div style={footerColTitleStyle}>サポート</div>
            <Link href="/contact" style={footerLinkStyle} className="legal-footer-link">お問い合わせ</Link>
          </div>
        </div>
        <div className="lp-footer-bottom" style={footerBottomStyle}>
          <p style={footerBottomPStyle}>© 2026 NativeFlow. All rights reserved.</p>
          <p style={footerBottomP2Style}>Speak with AI. Learn like a native.</p>
        </div>
      </footer>
    </div>
  )
}

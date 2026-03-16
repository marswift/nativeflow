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
    title: 'はじめに',
    body: '株式会社Marswift（以下「当社」）は、当社が運営するAI語学学習サービス「NativeFlow」（usenativeflow.com、以下「本サービス」）における個人情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。\n\n本サービスをご利用いただくことで、本ポリシーに同意いただいたものとみなします。',
  },
  {
    title: '収集する情報',
    body: 'アカウント情報：\nメールアドレス、パスワード（暗号化保存）、お名前（任意）、プロフィール画像（任意）\n\n学習データ：\nレッスン履歴、会話ログ、学習時間、正答率、習得語彙、学習目標・レベル設定\n\n利用状況データ：\nアクセスログ、端末・ブラウザ情報、IPアドレス、Cookie情報\n\n決済情報：\nカード情報はStripeが処理します。当社はカード番号等の決済情報を保持しません。',
  },
  {
    title: '情報の利用目的',
    body: 'サービス提供：\nAIレッスンの生成・最適化、学習進捗の管理、ユーザーサポートの提供\n\nサービス改善：\n機能改善・開発、バグ修正、利用傾向の統計分析（匿名化した形式で実施）\n\nコミュニケーション：\n学習リマインダー、重要なお知らせ、ニュースレター（購読解除可能）\n\nセキュリティ：\n不正アクセスの検知・防止、利用規約違反の調査',
  },
  {
    title: 'AIと会話データについて',
    body: '本サービスのAI会話機能において、ユーザーとAIの会話内容は以下の目的で処理されます。\n・レッスンの品質向上および個別最適化のための分析\n・SRS（間隔反復学習）システムによる復習スケジュールの生成\n・学習効果の測定と進捗レポートの作成\n\n会話データはOpenAI APIを通じて処理されます。OpenAIのデータ取り扱いについては、OpenAIのプライバシーポリシーもご参照ください。',
  },
  {
    title: '第三者への情報提供',
    body: '当社は、以下の場合を除き、ユーザーの個人情報を第三者に販売・提供しません。\n\n業務委託先：\nOpenAI（AI処理）、Supabase（DB）、Stripe（決済）、Vercel（ホスティング）等、サービス提供に必要な委託先\n\n法的要請：\n法令に基づく開示要求、裁判所命令、または当社・ユーザー・第三者の権利保護に必要な場合\n\n事業承継：\n合併・買収・事業譲渡等の際、承継先に個人情報が移転される場合（事前にご連絡します）',
  },
  {
    title: 'データの保護',
    body: '当社は以下のセキュリティ対策を講じています。\n・通信の暗号化（TLS/HTTPS）\n・パスワードのハッシュ化保存\n・データベースのアクセス制御・暗号化\n・定期的なセキュリティ監査\n\nただし、インターネット上での完全な安全性を保証することはできません。',
  },
  {
    title: 'ユーザーの権利',
    body: '開示・確認：\n当社が保有する個人情報の内容を確認できます\n\n訂正・削除：\n不正確な情報の訂正、または個人情報の削除を請求できます\n\n利用停止：\nマーケティング目的での利用停止・オプトアウトができます\n\nデータ出力：\n保有する学習データを一般的な形式でエクスポートできます（設定画面より）',
  },
  {
    title: 'Cookieについて',
    body: '本サービスでは、ログイン状態の維持（必須）、ユーザー設定の保存、利用状況の分析（匿名化）を目的にCookieを使用します。ブラウザ設定から無効化できますが、一部機能が利用できなくなる場合があります。',
  },
  {
    title: 'ポリシーの変更',
    body: '当社は法令の変更やサービス改善に伴い、本ポリシーを更新することがあります。重要な変更がある場合はメールまたはサービス内通知でお知らせします。変更後も本サービスをご利用いただいた場合、更新後のポリシーに同意いただいたものとみなします。',
  },
  {
    title: 'お問い合わせ',
    body: '事業者名：株式会社Marswift\n個人情報取扱責任者：石田 昌宏\nメール：info@usenativeflow.com\n受付時間：平日 10:00〜18:00（JST）',
  },
]

export default function PrivacyPage() {
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
          <h1 className="legal-title">プライバシーポリシー</h1>
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

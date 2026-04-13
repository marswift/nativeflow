import type { CSSProperties } from 'react'

const C = {
  dark: '#1a1a2e',
  mid: '#4a4a6a',
  white: '#ffffff',
  border: '#ede9e2',
} as const

const containerStyle: CSSProperties = {
  background: C.white, borderRadius: 20, padding: '32px 40px',
  boxShadow: '0 2px 16px rgba(0,0,0,.05)', border: `1.5px solid ${C.border}`,
}
const headerStyle: CSSProperties = {
  background: `linear-gradient(160deg, ${C.white} 55%, #fff8f2 100%)`,
  borderBottom: `1px solid ${C.border}`, padding: '56px 40px 48px',
}
const heroInnerStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', textAlign: 'center' }
const mainStyle: CSSProperties = { maxWidth: 720, margin: '0 auto', padding: '40px 40px 80px' }
const sectionStyle: CSSProperties = { marginBottom: 28 }
const sectionStyleLast: CSSProperties = { marginBottom: 0 }
const sectionTitleStyle: CSSProperties = { fontSize: 17, fontWeight: 800, color: C.dark, marginBottom: 12, letterSpacing: '-.2px' }
const sectionBodyStyle: CSSProperties = { fontSize: 14, color: C.mid, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }

const SECTIONS: { title: string; body: string }[] = [
  { title: '第1条（適用）', body: '本利用規約（以下「本規約」）は、株式会社Marswift（以下「当社」）が提供するAI語学学習サービス「NativeFlow」（usenativeflow.com、以下「本サービス」）の利用に関する条件を定めるものです。\n\nユーザーは本規約に同意した上で本サービスを利用するものとし、本サービスの利用をもって本規約に同意したものとみなします。' },
  { title: '第2条（利用登録）', body: '本サービスの利用を希望する方は、当社の定める方法により利用登録を申請し、当社がこれを承認することで利用登録が完了します。\n\n当社は、以下の場合に利用登録を拒否することがあります。\n・虚偽の情報で登録申請した場合。\n・過去に本規約違反があった場合。\n・13歳未満の方。\n・その他当社が不適切と判断した場合。' },
  { title: '第3条（アカウント管理）', body: 'ユーザーは、自己の責任においてパスワードおよびアカウント情報を管理するものとします。\n・パスワードを第三者に開示・共有しないこと。\n・不正利用が発覚した場合は直ちに当社に通知すること。\n・1アカウントは1名での利用を原則とします。\n・アカウントの第三者への譲渡・売買を禁止します。' },
  { title: '第4条（AIコンテンツの利用）', body: '本サービスではOpenAI APIを活用したAI会話機能を提供します。\n・AIの生成内容は必ずしも正確・完全ではありません。\n・AIとの会話内容は学習改善・サービス向上に利用される場合があります。\n・AIが生成したコンテンツの著作権については当社が定める範囲で利用できます。\n・AIを利用した不正行為・悪用は禁止します。' },
  { title: '第5条（禁止事項）', body: 'ユーザーは以下の行為を行ってはなりません。\n\n法令違反・犯罪行為：\n法令に違反する行為、犯罪行為に関連する行為。\n\n不正アクセス：\n当社のサーバー・ネットワークへの不正アクセス・妨害行為。\n\n知的財産権の侵害：\n当社または第三者の著作権・商標権・特許権等の侵害。\n\n迷惑行為：\n他のユーザーや第三者への嫌がらせ・誹謗中傷。\n\n商業目的の無断利用：\n当社の許可なくサービスを商業目的で利用すること。\n\nリバースエンジニアリング：\n本サービスを解析・改ざん・複製する行為。\n\n虚偽情報の登録：\n虚偽の情報でアカウントを登録・使用する行為。' },
  { title: '第6条（知的財産権）', body: '本サービスのコンテンツ（テキスト・画像・音声・プログラム等）に関する著作権その他の知的財産権は、当社または正当な権利者に帰属します。\n\nユーザーが本サービスを通じて作成した学習データ・会話ログについては、ユーザー自身の情報として取り扱います。ただし、当社はサービス改善のために匿名化した形で利用することができます。' },
  { title: '第7条（免責事項）', body: '当社は以下について責任を負いません。\n・本サービスの利用によって生じた損害（直接・間接を問わず）。\n・AIが生成したコンテンツの正確性・完全性。\n・通信障害・システム障害によるサービスの中断・停止。\n・ユーザー間または第三者との間で生じたトラブル。\n・インターネット接続環境に起因する問題。\n\n当社の故意または重大な過失による場合を除き、当社の賠償責任は月額料金を上限とします。' },
  { title: '第8条（サービスの変更・終了）', body: '当社は、事前の通知なくサービスの内容を変更・追加・削除することがあります。\n\nサービスを終了する場合は、30日以上前にメールおよびサービス内でお知らせします。サービス終了に伴う未消化分の返金については、別途定める返金ポリシーに従います。' },
  { title: '第9条（規約の変更）', body: '当社は、必要と判断した場合に本規約を変更できるものとします。重要な変更の場合は、メールまたはサービス内の通知にてお知らせします。\n\n変更後の規約はサービス内に掲示した時点から効力を生じ、変更後も本サービスをご利用いただいた場合、変更後の規約に同意いただいたものとみなします。' },
  { title: '第10条（準拠法・管轄裁判所）', body: '本規約の解釈は日本法に準拠します。\n\n本サービスに関連して生じた紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。' },
  { title: '第11条（お問い合わせ）', body: '事業者名：株式会社Marswift\n代表者：石田 昌宏\n所在地：東京都板橋区中台1-23-5\nメール：info@usenativeflow.com\n制定日：2026年3月11日\n最終更新日：2026年3月11日' },
]

export default function TermsPage() {
  return (
    <>
      <header className="legal-hero-wrap" style={headerStyle}>
        <div style={heroInnerStyle}>
          <h1 className="legal-title">利用規約</h1>
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
    </>
  )
}

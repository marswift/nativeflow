# NativeFlow — AI引き継ぎドキュメント

最終更新: 2026-03-20

---

## プロジェクト概要

- **サービス名**: NativeFlow
- **概要**: AI語学学習SaaS（日本人向け英語学習）
- **運営会社**: 株式会社Marswift（東京）
- **技術スタック**: Next.js (App Router), Supabase, Stripe, TypeScript, Tailwind CSS, OpenAI API

---

## ディレクトリ構造

```
app/          # Next.js App Router ページ・APIルート
lib/          # ビジネスロジック・サービス層
components/   # 共通UIコンポーネント
docs/         # ドキュメント
```

---

## 重要な設計ルール

### Supabaseクライアント

| 使用場所 | 使うクライアント |
|---|---|
| `app/`配下のクライアントコンポーネント（`'use client'`） | `getSupabaseBrowserClient()` from `lib/supabase/browser-client` |
| `app/api/`配下のAPIルート | `createClient()` with サービスロールキー（既存のまま） |
| `lib/`配下でAPIルートから呼ばれるファイル | `supabase` from `lib/supabase.ts`（古いクライアント） |

**重要**: クライアントを混在させるとセッションが共有されずログインループが発生する。

### ファイル配置ルール

- `lib/`直下 → 現役の本番コード
- `lib/lesson/` → lesson系のpure function（型定義・エンジン）
- `lib/supabase/` → Supabaseクライアント関連
- `app/api/` → APIルート（サーバーサイド）

### APIルートの認証

クライアントからAPIルートを呼ぶときは必ず`Authorization`ヘッダーを付ける：
```ts
const { data: { session } } = await supabase.auth.getSession()
await fetch('/api/stripe/checkout', {
  headers: { Authorization: `Bearer ${session?.access_token}` }
})
```

### useEffectの依存配列

`router`を依存配列に入れるとループする。必ず`[]`にする：
```ts
// NG
}, [router])

// OK
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

---

## Stripe連携

### 環境変数
```
STRIPE_SECRET_KEY
STRIPE_MONTHLY_PRICE_ID=price_1TBGW7DsDr2ctGhPYw9nKv4O
STRIPE_YEARLY_PRICE_ID=price_1TCYwHDsDr2ctGhPoAkLoBmH
STRIPE_WEBHOOK_SECRET=whsec_e22bac...
STRIPE_PORTAL_CONFIGURATION_ID=bpc_1TBRgcDsDr2ctGhPkD3SAs8S
STRIPE_PORTAL_RETURN_URL=http://localhost:3000/settings/billing
```

### ローカル開発時の必須手順
```bash
# ターミナル1
npm run dev

# ターミナル2（必須）
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### DBに保存するStripe情報（user_profilesテーブル）
- `stripe_customer_id`
- `stripe_subscription_id`
- `subscription_status` → trialing / active / canceled / unpaid
- `current_period_end` → 次回決済日
- `cancel_at_period_end` → 解約予定フラグ
- `planned_plan_code` → monthly / yearly（現在のプラン）
- `next_plan_code` → 次回更新後のプラン（プラン変更予約時）

### プラン変更の仕組み
- ポータルでプラン変更 → `subscription_schedule.updated` webhookが発火
- 変更は次の請求サイクルから適用
- `next_plan_code`に次のプランが保存される
- billingページに「次回更新日より〇〇プランに変更されます」と表示

### 解約・復活
- 解約 → Stripeポータルから「サブスクリプションをキャンセル」
- アカウントデータは残る（ログイン可能）
- 復活 → billingページの「学習を再開する」ボタンから新規決済

---

## 学習計画の計算ロジック（lib/study-plan-service.ts）

話せるようになりたい期間から1日の学習時間を逆算：

| 期間 | 1日の学習時間（beginner） |
|---|---|
| 6ヶ月 | 220分 |
| 1年 | 110分 |
| 1年6ヶ月 | 75分 |
| 2年 | 55分 |
| 2年6ヶ月 | 45分 |
| 3年 | 40分 |
| 3年以上 | 30分（固定） |

レベルによって目標時間が変わる：
- beginner: 550時間
- intermediate: 400時間
- advanced: 200時間

---

## キャラクター選択ロジック

`lib/lesson-page-data.ts`でレッスン開始前にキャラクターが決まる：

- cafe / shopping / restaurant / daily / home → **Emma**
- travel / airport / station / hotel → **Leo**
- office / question / support / general → **Alex**

ユーザーの`target_outcome_text`からthemeが生成され、themeからsceneType、sceneTypeからキャラクターが決まる。

---

## 削除済みファイル（参照してはいけない）

```
lib/ai/ai-conversation-engine.ts          # lib/ai-conversation-engine.ts が本物
lib/hooks/useConversationLesson.ts        # lib/use-conversation-lesson.ts が本物
lib/conversation/conversation-facade.ts  # lib/conversation-lesson-runtime-facade.ts が本物
lib/daily-story/ フォルダ丸ごと（6ファイル）
lib/review/review-scheduler.ts           # lib/review-scheduler-engine.ts が本物
lib/srs-algorithm.ts                     # 未使用だったため削除
lib/flow-points.ts                       # lib/progression-utils.ts に統一
app/api/lesson/start/route.ts            # 未使用だったため削除
app/api/lesson/turn/route.ts             # 未使用だったため削除
```

---

## 旧システム（現役だが旧依存あり・触らない）

以下は現役コードが依存しているため削除不可。将来的にリファクタ予定：

- `lib/lesson-runtime.ts` → `lesson-page-data.ts`の`createSession()`が依存
- `lib/lesson-progress.ts` → `lesson-actions`経由で間接使用
- `lib/lesson-actions.ts` → 同上
- `lib/lesson-stats.ts` / `lesson-summary.ts` → 旧エンジン型に依存
- `lib/lesson-run-service.ts` → 旧エンジンに依存

---

## user_profilesテーブルの主要カラム

```
id
ui_language_code
target_language_code
target_country_code
target_region_slug
current_level              # beginner / intermediate / advanced
speak_by_deadline_text     # 6ヶ月 / 1年 / 1年6ヶ月 / 2年 / 2年6ヶ月 / 3年 / 3年以上
target_outcome_text        # 学習目標テキスト
daily_study_minutes_goal   # 1日の学習目標時間（study-plan-serviceで計算）
username
total_flow_points
current_streak_days
subscription_status
current_period_end
cancel_at_period_end
planned_plan_code
next_plan_code
stripe_customer_id
stripe_subscription_id
```

---

## 現在の未解決タスク

- [ ] dashboardの今日のレッスン時間が0分（レッスン完了後の`daily_stats`書き込み要確認）
- [ ] `lib/openai.ts`の削除（`lib/openai-client.ts`に統一済みだが参照確認が必要）
- [ ] 旧システム（lesson-runtime.ts等）のリファクタ（中長期）

---

## AI役割分担

| AI | 役割 |
|---|---|
| ChatGPT | 構想・設計・仕様決め・Cursorへの実装指示生成 |
| Claude | コード修正・整合性チェック・リファクタリング・設計相談・新ファイル追加前の確認 |
| Cursor | コード生成・ファイル単位の実装 |

### 新ファイルを追加するとき
必ずClaudeに事前確認：
```
「〇〇という機能を追加したいです。
既存のコードベースでは△△が関連します。
新しいファイルはどこに作るべきですか？」
```

### このドキュメントの更新タイミング
- 新機能を追加したとき
- ファイルを削除・移動したとき
- 設計ルールが変わったとき
- バグを修正したとき
# NativeFlow — Claude Instructions

## このファイルについて
Claude Codeがプロジェクトを理解するための指示書です。
会話の最初に必ず読んでください。

---

## プロジェクト概要

- **サービス名**: NativeFlow
- **種別**: AI語学学習SaaS（MVP：日本人向け英語学習）
- **運営**: 株式会社Marswift（東京）
- **目標**: 世界展開可能な語学学習プラットフォーム

---

## AIチーム役割分担

| AI | 役割 |
|---|---|
| **ChatGPT** | アーキテクト・PM・最終仕様決定者 |
| **Claude** | 設計補助・文書化・仕様整理・文言・補助実装 |
| **Cursor** | 実装（Next.js / Supabase / TypeScript） |

**重要**: 最終仕様はChatGPTが決定する。Claudeは勝手に仕様を変えない。

---

## 技術スタック

```
フロントエンド:  Next.js (App Router) + TypeScript + Tailwind CSS
バックエンド:    Supabase (Auth / DB / Storage)
決済:           Stripe
AI:             OpenAI API
デプロイ:       Vercel
開発環境:       nvm + Node.js LTS
```

---

## 開発環境の起動手順

```bash
# 必ずこの順番で実行
nvm use default
npm run dev -- --hostname localhost
```

- `localhost:3000` で確認
- `node_modules` は `~/Desktop/nativeflow/` 配下に存在
- `.env.local` は**絶対に編集・コミットしない**

---

## デザインシステム

### カラーパレット
```
ネイビー:  #0f172a（メイン背景・ダーク要素）
オレンジ:  #f97316（アクセント・CTA・強調）
クリーム:  #fefce8（明るい背景・カード）
ゴールド:  #f59e0b（スター・ランク・報酬）
```

### UIコンセプト
- **ゲームフィール**: XPバー、ランクカード、ロック状態、ホログラフィック会員カード
- **トーン**: 暖かく・シンプル・迷わない
- **優先**: モバイルファースト

### UIコンポーネント方針
- ゲーム要素（XP・ランク・バッジ）は積極採用
- アニメーションは控えめに（パフォーマンス優先）
- 日本語・英語の両表示に対応する設計

---

## 学習コンセプト

- 生活シーンベース学習（朝〜夜のサイクル）
- 目標設定ベース（期間・1日の学習時間を自動計算）
- SRS（間隔反復学習）内蔵
- 予定と実績の差異表示
- 恋愛シーンは optional（デフォルトOFF）

---

## ディレクトリ構成

```
nativeflow/
├── app/                  # Next.js App Router
│   ├── (auth)/          # 認証関連ページ
│   ├── dashboard/       # ダッシュボード
│   ├── lessons/         # レッスン機能
│   ├── billing/         # 課金・プラン
│   └── settings/        # ユーザー設定
├── components/          # 共通UIコンポーネント
├── lib/                 # ユーティリティ・API
├── types/               # TypeScript型定義
└── public/              # 静的ファイル
```

---

## コーディングルール

1. **TypeScript必須** — `any` 型は使わない
2. **Tailwind CSS使用** — インラインstyleは極力使わない
3. **コンポーネント分割** — 100行超えたら分割を検討
4. **Supabase操作** — `lib/supabase/` 配下に集約
5. **環境変数** — `.env.local` のキーは `NEXT_PUBLIC_` prefix付きで管理
6. **コミットメッセージ** — 日本語OK、機能単位でこまめに

---

## Claudeの行動ルール

### やること
- 仕様の整理・構造化・文書化
- UI/UX文言の提案（日英両対応）
- 既存コードとの整合性を確認してから実装案を提示
- 変更する場合は「どのファイルのどの部分を変えるか」を明示
- 実装プロンプトをCursor向けに変換（Context/TechStack/Task/Requirements/Behavior/OutputFormat）

### やらないこと
- 勝手に仕様を追加・変更
- MVPを超える機能の実装
- `.env.local` の操作
- 本番Supabase DBへの直接変更
- `rm -rf` などの破壊的コマンド

---

## よく使う操作

```bash
# 開発サーバー起動
nvm use default && npm run dev -- --hostname localhost

# ビルド確認
npm run build

# 型チェック
npx tsc --noEmit

# Lint
npm run lint

# Git（安全なコマンドは自動実行OK）
git status
git add .
git commit -m "メッセージ"
git diff
```

---

## 現在のフェーズ・状況

- MVP開発中（日本人向け英語学習）
- フロントエンドのgame-feel UIリデザイン進行中
- 法的ページ4種（プライバシーポリシー・特商法・利用規約・会社情報）実装済み
- 課金ページ（Stripe連携）実装中

---

## 出力フォーマット

回答は常に以下の順で整理する：
1. **結論**（何をするか）
2. **理由**（なぜそうするか）
3. **実行案**（具体的なコード・手順）

曖昧な場合は補完しすぎず、前提を明示してから進める。

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Onboarding

オンボーディング画面で `public.user_profiles` の確認済み MVP スキーマに従い、以下を収集して Supabase に保存します。

### 確認済み user_profiles カラム（オンボーディングで使用）

- `id` — ログインユーザー ID（uuid）
- `ui_language_code` — アプリ表示言語（ja, en, ko, zh）
- `target_language_code` — 学習対象言語（en, ja, ko, zh）
- `target_country_code` — 対象国（US, JP, KR, CN）
- `target_region_slug` — 対象地域（MVPでは任意の自由入力テキスト）
- `current_level` — 現在のレベル（MVPでは beginner, intermediate, advanced）
- `target_outcome_text` — 目指したいこと（テキスト）
- `daily_study_minutes_goal` — 1日あたりの学習時間（分）
- `preferred_session_length` — 希望セッション長（short, standard, deep）
- `enable_dating_contexts` — デート・恋愛コンテキストを含めるか（boolean）

### データベースの前提

- `user_profiles.id` は Supabase の `auth.users.id` と同一である。
- `user_profiles` は 1 ユーザー 1 プロフィールのテーブルである。
- プロフィールの更新は upsert（`id` を conflict キー）で行う。
- RLS ポリシーでは、アクセスを `auth.uid() = id` に限定すること。
- テーブル定義・RLS は Supabase 側で管理し、このリポジトリでは変更しない。

データベーススキーマはこのリポジトリでは変更しません。テーブル・カラムは Supabase 側で上記と一致している必要があります。

### テスト手順（ローカル）

1. `npm run dev` で起動し、[http://localhost:3000](http://localhost:3000) を開く。
2. トップの「オンボーディングへ」をクリックして `/onboarding` に遷移する。
3. 既存プロフィールがあればフォームにプリロードされる。必須項目を入力し「保存する」をクリックする。
4. 未ログインの場合: 「ログインしてください。プロフィールを保存するにはサインインが必要です。」と表示される。Supabase Auth でサインイン後に再度送信する。
5. ログイン済みの場合: `user_profiles` に upsert され、トップページ（`/`）へリダイレクトする。（`/dashboard` が用意されたら保存後のリダイレクト先を `/dashboard` に変更する想定。）
6. Supabase Dashboard → Table Editor → `user_profiles` で、該当ユーザー ID のレコードが保存されていることを確認する。

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

To deploy, use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme). See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

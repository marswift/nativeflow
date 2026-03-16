/**
 * Login UI copy for the NativeFlow MVP.
 * Japanese only; structure is ready for future i18n.
 * UI-independent; consumed by app/login/page.tsx or other login UI.
 */

export type LoginCopy = {
  loading: string
  titles: {
    login: string
    signup: string
  }
  labels: {
    email: string
    password: string
  }
  buttons: {
    sending: string
    login: string
    signup: string
  }
  errors: {
    validationRequired: string
    loginFallback: string
    signupFallback: string
    generic: string
  }
  /** Map Supabase auth error message to user-facing string (login). */
  loginErrorMessages: Record<string, string>
  /** Map Supabase auth error message to user-facing string (signup). */
  signupErrorMessages: Record<string, string>
  success: {
    signupConfirmEmail: string
  }
  modeSwitch: {
    noAccountPrompt: string
    signupLink: string
    haveAccountPrompt: string
    loginLink: string
  }
  backToHome: string
}

/** Japanese login copy. Use this in the login page until language switching is added. */
export const LOGIN_COPY_JA: LoginCopy = {
  loading: '読み込み中...',
  titles: {
    login: 'ログインして学習を続ける',
    signup: '新規アカウントを作成',
  },
  labels: {
    email: 'メールアドレス',
    password: 'パスワード',
  },
  buttons: {
    sending: '送信中...',
    login: 'ログイン',
    signup: 'アカウントを作成',
  },
  errors: {
    validationRequired: 'メールアドレスとパスワードを入力してください。',
    loginFallback: 'ログインに失敗しました。入力内容をご確認ください。',
    signupFallback: '登録に失敗しました。入力内容をご確認ください。',
    generic: 'エラーが発生しました。しばらくしてからもう一度お試しください。',
  },
  loginErrorMessages: {
    'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません。',
  },
  signupErrorMessages: {
    'User already registered': 'このメールアドレスは既に登録されています。ログインしてください。',
  },
  success: {
    signupConfirmEmail:
      'アカウントを作成しました。確認のため、登録したメールアドレスに送ったリンクからメールを確認してください。',
  },
  modeSwitch: {
    noAccountPrompt: 'アカウントをお持ちでない方は',
    signupLink: '新規登録',
    haveAccountPrompt: 'すでにアカウントがある方は',
    loginLink: 'ログイン',
  },
  backToHome: 'トップへ戻る',
}

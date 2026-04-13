/**
 * Minimal UI copy for auth screens (login, signup, onboarding).
 * Not a full i18n system — just a typed dictionary for critical user-facing text.
 * Default: Japanese. English added for global expansion.
 */

export type AuthCopyKey = 'ja' | 'en' | 'ko'

export type AuthCopy = {
  login: {
    title: string
    subtitle: string
    googleButton: string
    googleLoading: string
    magicLinkLabel: string
    magicLinkButton: string
    magicLinkSending: string
    magicLinkSentTitle: string
    magicLinkSentBody: string
    magicLinkRetry: string
    passwordToggleOpen: string
    passwordToggleClose: string
    passwordLabel: string
    passwordPlaceholder: string
    passwordButton: string
    passwordSubmitting: string
    forgotPassword: string
    signupPrompt: string
    signupLink: string
    emailLabel: string
    emailPlaceholder: string
    emailRequired: string
    emailInvalid: string
    passwordRequired: string
    errorInvalidCredentials: string
    errorEmailNotConfirmed: string
    errorGeneric: string
    errorGoogleFailed: string
    errorMagicLinkFailed: string
    errorRateLimit: string
    bannerConfirmError: string
    bannerConfirmed: string
    bannerRegistered: string
    bannerReset: string
  }
  signup: {
    title: string
    subtitle: string
    googleButton: string
    googleLoading: string
    magicLinkButton: string
    magicLinkSending: string
    magicLinkSentTitle: string
    magicLinkSentBody: string
    magicLinkRetry: string
    emailLabel: string
    emailPlaceholder: string
    emailRequired: string
    emailInvalid: string
    loginPrompt: string
    loginLink: string
    errorGoogleFailed: string
    errorGeneric: string
    errorAlreadyRegistered: string
    errorSignupDisabled: string
    errorInvalidEmail: string
    errorRateLimit: string
    planBadge: string
    planMonthly: string
    planYearly: string
    planYearlySaving: string
    planTrialNote: string
    planChangeLink: string
    noPlanTitle: string
    noPlanSubtitle: string
    noPlanNote: string
    noPlanLink: string
    divider: string
  }
  shared: {
    loading: string
    or: string
  }
}

const ja: AuthCopy = {
  login: {
    title: 'ログイン',
    subtitle: 'お好みの方法でログインしてください。',
    googleButton: 'Googleでログイン',
    googleLoading: 'リダイレクト中...',
    magicLinkLabel: 'メールアドレス',
    magicLinkButton: 'ログインリンクを送信',
    magicLinkSending: '送信中...',
    magicLinkSentTitle: 'ログインリンクを送信しました',
    magicLinkSentBody: 'メールに届いたリンクをクリックしてログインしてください。',
    magicLinkRetry: '別のメールアドレスで試す',
    passwordToggleOpen: 'パスワードでログイン',
    passwordToggleClose: 'パスワードログインを閉じる',
    passwordLabel: 'パスワード',
    passwordPlaceholder: '8文字以上',
    passwordButton: 'パスワードでログイン',
    passwordSubmitting: 'ログイン中...',
    forgotPassword: 'パスワードを忘れた方はこちら',
    signupPrompt: '初めての方は',
    signupLink: '新規登録',
    emailLabel: 'メールアドレス',
    emailPlaceholder: 'example@email.com',
    emailRequired: 'メールアドレスを入力してください',
    emailInvalid: '正しいメールアドレスを入力してください',
    passwordRequired: 'パスワードを入力してください',
    errorInvalidCredentials: 'メールアドレスまたはパスワードが正しくありません',
    errorEmailNotConfirmed: 'メール認証が完了していません。\n確認メールをご確認ください。',
    errorGeneric: 'ログインに失敗しました。時間をおいて再度お試しください',
    errorGoogleFailed: 'Googleログインに失敗しました。時間をおいて再度お試しください。',
    errorMagicLinkFailed: 'マジックリンクの送信に失敗しました。時間をおいて再度お試しください。',
    errorRateLimit: '送信回数の上限に達しました。しばらく時間をおいて再度お試しください。',
    bannerConfirmError: 'メールアドレスの確認に失敗しました。もう一度お試しください。',
    bannerConfirmed: 'メールアドレスの確認が完了しました。ログインしてください。',
    bannerRegistered: 'アカウント登録が完了しました。ログインしてください。',
    bannerReset: 'パスワードを再設定しました。ログインしてください。',
  },
  signup: {
    title: '新規登録',
    subtitle: 'お好みの方法でアカウントを作成してください。',
    googleButton: 'Googleで登録',
    googleLoading: 'リダイレクト中...',
    magicLinkButton: '登録リンクを送信',
    magicLinkSending: '送信中...',
    magicLinkSentTitle: '登録リンクを送信しました',
    magicLinkSentBody: 'メールに届いたリンクをクリックして登録を完了してください。',
    magicLinkRetry: '別のメールアドレスで試す',
    emailLabel: 'メールアドレス',
    emailPlaceholder: 'example@email.com',
    emailRequired: 'メールアドレスを入力してください',
    emailInvalid: '正しいメールアドレスを入力してください',
    loginPrompt: 'すでにアカウントをお持ちの方は',
    loginLink: 'ログイン',
    errorGoogleFailed: 'Googleアカウントでの登録に失敗しました。時間をおいて再度お試しください。',
    errorGeneric: '登録に失敗しました。時間をおいて再度お試しください',
    errorAlreadyRegistered: 'このメールアドレスは既に登録されています。ログインページからお試しください。',
    errorSignupDisabled: '現在この方法では登録できません。管理者設定をご確認ください',
    errorInvalidEmail: '正しいメールアドレスを入力してください',
    errorRateLimit: 'メール送信回数の上限に達しました。\n少し時間をおいて再度お試しください',
    planBadge: '選択中のプラン',
    planMonthly: '月額プラン',
    planYearly: '年額プラン',
    planYearlySaving: '約33%お得！',
    planTrialNote: 'まずは7日間無料でお試しください。無料期間終了後にご選択のプランで課金が開始されます。',
    planChangeLink: 'プランを変更',
    noPlanTitle: '無料トライアルを開始',
    noPlanSubtitle: '7日間は無料です',
    noPlanNote: 'プランは登録後に選べます。',
    noPlanLink: '料金プランを見る',
    divider: 'または',
  },
  shared: {
    loading: '読み込み中...',
    or: 'または',
  },
}

const en: AuthCopy = {
  login: {
    title: 'Log in',
    subtitle: 'Choose your preferred login method.',
    googleButton: 'Log in with Google',
    googleLoading: 'Redirecting...',
    magicLinkLabel: 'Email address',
    magicLinkButton: 'Send login link',
    magicLinkSending: 'Sending...',
    magicLinkSentTitle: 'Login link sent',
    magicLinkSentBody: 'Click the link in your email to log in.',
    magicLinkRetry: 'Try a different email',
    passwordToggleOpen: 'Log in with password',
    passwordToggleClose: 'Hide password login',
    passwordLabel: 'Password',
    passwordPlaceholder: '8+ characters',
    passwordButton: 'Log in with password',
    passwordSubmitting: 'Logging in...',
    forgotPassword: 'Forgot your password?',
    signupPrompt: "Don't have an account?",
    signupLink: 'Sign up',
    emailLabel: 'Email address',
    emailPlaceholder: 'example@email.com',
    emailRequired: 'Please enter your email address',
    emailInvalid: 'Please enter a valid email address',
    passwordRequired: 'Please enter your password',
    errorInvalidCredentials: 'Incorrect email or password',
    errorEmailNotConfirmed: 'Your email has not been verified.\nPlease check your inbox.',
    errorGeneric: 'Login failed. Please try again later.',
    errorGoogleFailed: 'Google login failed. Please try again later.',
    errorMagicLinkFailed: 'Failed to send login link. Please try again later.',
    errorRateLimit: 'Too many attempts. Please wait and try again.',
    bannerConfirmError: 'Email verification failed. Please try again.',
    bannerConfirmed: 'Email verified. Please log in.',
    bannerRegistered: 'Account created. Please log in.',
    bannerReset: 'Password has been reset. Please log in.',
  },
  signup: {
    title: 'Sign up',
    subtitle: 'Choose your preferred signup method.',
    googleButton: 'Sign up with Google',
    googleLoading: 'Redirecting...',
    magicLinkButton: 'Send signup link',
    magicLinkSending: 'Sending...',
    magicLinkSentTitle: 'Signup link sent',
    magicLinkSentBody: 'Click the link in your email to complete registration.',
    magicLinkRetry: 'Try a different email',
    emailLabel: 'Email address',
    emailPlaceholder: 'example@email.com',
    emailRequired: 'Please enter your email address',
    emailInvalid: 'Please enter a valid email address',
    loginPrompt: 'Already have an account?',
    loginLink: 'Log in',
    errorGoogleFailed: 'Google signup failed. Please try again later.',
    errorGeneric: 'Registration failed. Please try again later.',
    errorAlreadyRegistered: 'This email is already registered. Please log in instead.',
    errorSignupDisabled: 'This signup method is currently unavailable.',
    errorInvalidEmail: 'Please enter a valid email address',
    errorRateLimit: 'Too many email requests.\nPlease wait and try again.',
    planBadge: 'Selected plan',
    planMonthly: 'Monthly plan',
    planYearly: 'Annual plan',
    planYearlySaving: 'Save ~33%!',
    planTrialNote: 'Start with a free 7-day trial. Billing begins after the trial ends.',
    planChangeLink: 'Change plan',
    noPlanTitle: 'Start free trial',
    noPlanSubtitle: '7 days free',
    noPlanNote: 'You can choose a plan after signing up.',
    noPlanLink: 'View pricing',
    divider: 'or',
  },
  shared: {
    loading: 'Loading...',
    or: 'or',
  },
}

const ko: AuthCopy = {
  login: {
    title: '로그인',
    subtitle: '원하는 방법으로 로그인하세요.',
    googleButton: 'Google로 로그인',
    googleLoading: '리다이렉트 중...',
    magicLinkLabel: '이메일 주소',
    magicLinkButton: '로그인 링크 보내기',
    magicLinkSending: '전송 중...',
    magicLinkSentTitle: '로그인 링크를 보냈습니다',
    magicLinkSentBody: '이메일에 있는 링크를 클릭하여 로그인하세요.',
    magicLinkRetry: '다른 이메일로 시도',
    passwordToggleOpen: '비밀번호로 로그인',
    passwordToggleClose: '비밀번호 로그인 닫기',
    passwordLabel: '비밀번호',
    passwordPlaceholder: '8자 이상',
    passwordButton: '비밀번호로 로그인',
    passwordSubmitting: '로그인 중...',
    forgotPassword: '비밀번호를 잊으셨나요?',
    signupPrompt: '계정이 없으신가요?',
    signupLink: '회원가입',
    emailLabel: '이메일 주소',
    emailPlaceholder: 'example@email.com',
    emailRequired: '이메일 주소를 입력해 주세요',
    emailInvalid: '올바른 이메일 주소를 입력해 주세요',
    passwordRequired: '비밀번호를 입력해 주세요',
    errorInvalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다',
    errorEmailNotConfirmed: '이메일 인증이 완료되지 않았습니다.\n받은 편지함을 확인해 주세요.',
    errorGeneric: '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    errorGoogleFailed: 'Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    errorMagicLinkFailed: '로그인 링크 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    errorRateLimit: '전송 횟수 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.',
    bannerConfirmError: '이메일 인증에 실패했습니다. 다시 시도해 주세요.',
    bannerConfirmed: '이메일 인증이 완료되었습니다. 로그인해 주세요.',
    bannerRegistered: '계정 등록이 완료되었습니다. 로그인해 주세요.',
    bannerReset: '비밀번호가 재설정되었습니다. 로그인해 주세요.',
  },
  signup: {
    title: '회원가입',
    subtitle: '원하는 방법으로 계정을 만드세요.',
    googleButton: 'Google로 가입',
    googleLoading: '리다이렉트 중...',
    magicLinkButton: '가입 링크 보내기',
    magicLinkSending: '전송 중...',
    magicLinkSentTitle: '가입 링크를 보냈습니다',
    magicLinkSentBody: '이메일에 있는 링크를 클릭하여 가입을 완료하세요.',
    magicLinkRetry: '다른 이메일로 시도',
    emailLabel: '이메일 주소',
    emailPlaceholder: 'example@email.com',
    emailRequired: '이메일 주소를 입력해 주세요',
    emailInvalid: '올바른 이메일 주소를 입력해 주세요',
    loginPrompt: '이미 계정이 있으신가요?',
    loginLink: '로그인',
    errorGoogleFailed: 'Google 가입에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    errorGeneric: '가입에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    errorAlreadyRegistered: '이미 등록된 이메일입니다. 로그인 페이지에서 시도해 주세요.',
    errorSignupDisabled: '현재 이 방법으로는 가입할 수 없습니다.',
    errorInvalidEmail: '올바른 이메일 주소를 입력해 주세요',
    errorRateLimit: '이메일 전송 횟수 한도에 도달했습니다.\n잠시 후 다시 시도해 주세요.',
    planBadge: '선택한 플랜',
    planMonthly: '월간 플랜',
    planYearly: '연간 플랜',
    planYearlySaving: '약 33% 절약!',
    planTrialNote: '7일 무료 체험으로 시작하세요. 체험 종료 후 선택한 플랜으로 결제가 시작됩니다.',
    planChangeLink: '플랜 변경',
    noPlanTitle: '무료 체험 시작',
    noPlanSubtitle: '7일간 무료',
    noPlanNote: '가입 후 플랜을 선택할 수 있습니다.',
    noPlanLink: '요금제 보기',
    divider: '또는',
  },
  shared: {
    loading: '로딩 중...',
    or: '또는',
  },
}

const AUTH_COPY: Record<AuthCopyKey, AuthCopy> = { ja, en, ko }

/**
 * Returns auth copy for the given language.
 * Falls back to Japanese for unsupported codes.
 */
export function getAuthCopy(lang: string | null | undefined): AuthCopy {
  if (lang === 'en') return AUTH_COPY.en
  if (lang === 'ko') return AUTH_COPY.ko
  return AUTH_COPY.ja
}

/**
 * Reads UI language preference from localStorage.
 * Use this on pre-auth screens where no DB profile is available.
 * Returns null if not set or not in a browser environment.
 */
export function readUiLanguageFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('nativeflow:ui_language') ?? null
  } catch {
    return null
  }
}

/**
 * Persists UI language preference to localStorage.
 * Called after onboarding or settings save.
 */
export function writeUiLanguageToStorage(code: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('nativeflow:ui_language', code)
  } catch {
    // Ignore storage errors
  }
}

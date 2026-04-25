/**
 * Rewards page UI copy — ja / en.
 * Follows the same pattern as auth-copy.ts and lesson-copy.ts.
 */

export type RewardsCopy = {
  pageTitle: string
  pageDescription: string
  diamondLabel: string
  aboutTitle: string
  aboutBody: string
  loading: string
  loginRequired: string
  purchaseError: string
  networkError: string
  // Buttons
  buttonUse: string
  buttonNotEnough: string
  buttonComingSoon: string
  buttonActive: string
  // Status badges
  badgeActive: string
  badgeComingSoon: string
  // Diamond purchase CTA
  buyCtaQuestion: string
  buyCtaButton: string
  buyModalTitle: string
  buyModalSubtitle: string
  buyModalEarnTip: string
  buyModalClose: string
  buyModalBuying: string
  buyModalError: string
  buyModalPopular: string
  buyModalBestValue: string
  // Purchase result banners
  purchaseSuccess: string
  purchaseCanceled: string
  // Items
  items: {
    streakShield: { name: string; subtitle: string; description: string }
    doubleBoost: { name: string; subtitle: string; description: string }
    premiumTheme: { name: string; subtitle: string; description: string }
    eventTicket: { name: string; subtitle: string; description: string }
  }
}

const REWARDS_COPY_JA: RewardsCopy = {
  pageTitle: 'Rewards',
  pageDescription: 'ダイヤモンドを使って、学習に役立つ特典やアイテムを手に入れましょう。',
  diamondLabel: 'ダイヤモンド',
  aboutTitle: 'ABOUT DIAMONDS',
  aboutBody: 'ダイヤモンドはレッスン完了やイベント参加で獲得することができます。継続日数の復活やその他報酬など、学習を助けるアイテム取得に使えます。毎日の学習でコツコツ貯めましょう。',
  loading: '読み込み中...',
  loginRequired: 'ログインが必要です',
  purchaseError: 'エラーが発生しました',
  networkError: '通信エラーが発生しました',
  buttonUse: '使う',
  buttonNotEnough: '不足しています',
  buttonComingSoon: 'Coming Soon',
  buttonActive: 'Active',
  badgeActive: 'ACTIVE',
  badgeComingSoon: 'COMING SOON',
  buyCtaQuestion: 'ダイヤモンドがもっと必要ですか？',
  buyCtaButton: 'ダイヤモンドを購入する',
  buyModalTitle: 'ダイヤモンド購入',
  buyModalSubtitle: 'パックを選んで決済へ進みます。',
  buyModalEarnTip: 'レッスンやイベントでもダイヤモンドを獲得できます。',
  buyModalClose: '閉じる',
  buyModalBuying: '決済画面へ移動中...',
  buyModalError: '購入処理に失敗しました。もう一度お試しください。',
  buyModalPopular: '人気',
  buyModalBestValue: 'お得',
  purchaseSuccess: 'ダイヤモンドを追加しました',
  purchaseCanceled: '購入はキャンセルされました',
  items: {
    streakShield: {
      name: 'Streak Shield',
      subtitle: '継続日数の復元',
      description: '途切れた継続日数を1日分回復します。学習の連続記録を守りましょう。',
    },
    doubleBoost: {
      name: 'Double Boost',
      subtitle: '報酬ブースト',
      description: '次のレッスンでダイヤ獲得が2倍になります（24時間有効）。',
    },
    premiumTheme: {
      name: 'Premium Theme',
      subtitle: 'プレミアムテーマ',
      description: '学習画面のデザインをカスタマイズできる限定テーマ。',
    },
    eventTicket: {
      name: 'Event Ticket',
      subtitle: 'イベントチケット',
      description: '特別イベントやチャレンジへの参加チケット。期間限定で開催予定。',
    },
  },
}

const REWARDS_COPY_EN: RewardsCopy = {
  pageTitle: 'Rewards',
  pageDescription: 'Use Diamonds to unlock perks and helpful items.',
  diamondLabel: 'Diamonds',
  aboutTitle: 'ABOUT DIAMONDS',
  aboutBody: 'Diamonds are earned by completing lessons and participating in events. Use them to restore streaks, activate boosts, and unlock rewards. Keep learning daily to build your collection.',
  loading: 'Loading...',
  loginRequired: 'Login required',
  purchaseError: 'An error occurred',
  networkError: 'Network error',
  buttonUse: 'Use',
  buttonNotEnough: 'Not enough',
  buttonComingSoon: 'Coming Soon',
  buttonActive: 'Active',
  badgeActive: 'ACTIVE',
  badgeComingSoon: 'COMING SOON',
  buyCtaQuestion: 'Need more Diamonds?',
  buyCtaButton: 'Buy Diamonds',
  buyModalTitle: 'Buy Diamonds',
  buyModalSubtitle: 'Choose a pack to proceed to checkout.',
  buyModalEarnTip: 'You can also earn Diamonds through lessons and events.',
  buyModalClose: 'Close',
  buyModalBuying: 'Redirecting to checkout...',
  buyModalError: 'Purchase failed. Please try again.',
  buyModalPopular: 'Popular',
  buyModalBestValue: 'Best Value',
  purchaseSuccess: 'Diamonds added!',
  purchaseCanceled: 'Purchase canceled.',
  items: {
    streakShield: {
      name: 'Streak Shield',
      subtitle: 'Restore streak',
      description: 'Recover 1 day of your broken streak. Protect your learning record.',
    },
    doubleBoost: {
      name: 'Double Boost',
      subtitle: 'Reward boost',
      description: 'Double your diamond earnings for the next lesson (24 hours).',
    },
    premiumTheme: {
      name: 'Premium Theme',
      subtitle: 'Custom theme',
      description: 'Customize your learning screen with an exclusive theme.',
    },
    eventTicket: {
      name: 'Event Ticket',
      subtitle: 'Event ticket',
      description: 'Access special events and challenges. Coming soon.',
    },
  },
}

const COPY_MAP: Record<string, RewardsCopy> = {
  ja: REWARDS_COPY_JA,
  en: REWARDS_COPY_EN,
}

export function getRewardsCopy(lang?: string | null): RewardsCopy {
  const normalized = (lang ?? 'ja').toLowerCase()
  const match = Object.keys(COPY_MAP).find((l) => normalized.startsWith(l))
  return COPY_MAP[match ?? 'ja']
}

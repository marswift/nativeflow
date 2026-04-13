import { notFound } from 'next/navigation'

const SUPPORTED_LOCALES = ['ja', 'en'] as const

type LocaleLayoutProps = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Locale-aware layout wrapper.
 *
 * Validates the locale segment and renders children.
 * Pages under app/[locale]/ inherit this layout.
 *
 * The root layout (app/layout.tsx) remains unchanged and handles
 * html/body/fonts. This layout sits between root and page content.
 *
 * Migration note: Move page routes from app/{route} to app/[locale]/{route}
 * incrementally. When next-intl is installed, re-add setRequestLocale()
 * and wrap children with NextIntlClientProvider.
 */
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  if (!SUPPORTED_LOCALES.includes(locale as 'ja' | 'en')) {
    notFound()
  }

  return children
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

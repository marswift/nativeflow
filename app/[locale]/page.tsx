type Props = {
  params: Promise<{ locale: string }>
}

/**
 * Locale index page.
 *
 * Minimal landing page for /ja and /en routes.
 * Once next-intl is installed and the root landing page (app/page.tsx)
 * is migrated here, this can be replaced with the full content.
 *
 * NOTE: setRequestLocale is intentionally omitted until next-intl
 * is added to package.json. Re-add it during the i18n migration.
 */
export default async function LocaleIndexPage({ params }: Props) {
  const { locale } = await params

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1>NativeFlow ({locale})</h1>
    </div>
  )
}

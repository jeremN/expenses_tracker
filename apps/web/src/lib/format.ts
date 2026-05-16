import { useTranslation, type Locale } from '~/i18n'

const TAGS: Record<Locale, string> = { en: 'en-US', fr: 'fr-FR' }

/**
 * Format integer cents as a currency string for the given locale.
 *
 * Currency is hardcoded to USD for now (matches the pre-i18n behaviour —
 * see the design doc). Multi-currency (feature 3) parameterizes the
 * currency code; this function is the single seam it changes.
 */
export function formatMoney(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(TAGS[locale], {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

/**
 * Format a stored 'YYYY-MM-DD' string as a locale short date.
 *
 * Parsed as a LOCAL calendar date — not `new Date(iso)`, which treats the
 * string as UTC midnight and shifts the day in negative-offset timezones.
 */
export function formatDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(TAGS[locale]).format(new Date(y, m - 1, d))
}

/** Hook binding the formatters to the active locale from context. */
export function useFormat() {
  const { locale } = useTranslation()
  return {
    formatMoney: (cents: number) => formatMoney(cents, locale),
    formatDate: (iso: string) => formatDate(iso, locale),
  }
}

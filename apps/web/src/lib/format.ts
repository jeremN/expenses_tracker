import { useLocale, type Locale, type Currency } from '~/i18n'

const TAGS: Record<Locale, string> = { en: 'en-US', fr: 'fr-FR' }

/**
 * Format integer cents as a currency string for the given locale and currency.
 *
 * The currency is supplied by the caller; when used via `useFormat()`, it is
 * sourced from the active locale context (`LocaleProvider` defaults to EUR).
 */
export function formatMoney(
  cents: number,
  locale: Locale,
  currency: Currency,
): string {
  return new Intl.NumberFormat(TAGS[locale], {
    style: 'currency',
    currency,
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

/**
 * The standalone currency symbol for a locale/currency (e.g. EUR -> "€",
 * USD -> "$"), extracted from Intl parts so it tracks the currency selector.
 */
export function currencySymbol(locale: Locale, currency: Currency): string {
  const parts = new Intl.NumberFormat(TAGS[locale], {
    style: 'currency',
    currency,
  }).formatToParts(0)
  return parts.find((p) => p.type === 'currency')?.value ?? currency
}

/** Hook binding the formatters to the active locale and currency from context. */
export function useFormat() {
  const { locale, currency } = useLocale()
  return {
    formatMoney: (cents: number) => formatMoney(cents, locale, currency),
    formatDate: (iso: string) => formatDate(iso, locale),
    currencySymbol: currencySymbol(locale, currency),
  }
}

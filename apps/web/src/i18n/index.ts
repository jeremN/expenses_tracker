import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import en from './en.json'
import fr from './fr.json'

export type Locale = 'en' | 'fr'

export type Currency = 'EUR' | 'USD' | 'GBP'

/** Selector options. EUR is the default (see design doc). */
export const CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP']

const dicts: Record<Locale, Record<string, string>> = { en, fr }

/**
 * Resolve a key for a locale with fallback chain:
 * active-locale dict -> en dict -> the key itself. Never throws.
 *
 * Interpolates every {name} token from `vars`. Values are inserted
 * literally in Object.entries order; a value containing another var's
 * {token} is NOT recursively re-substituted (acceptable — our strings
 * don't interpolate user-controlled text containing brace tokens).
 */
export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let s = dicts[locale][key] ?? en[key as keyof typeof en] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v))
    }
  }
  return s
}

/**
 * Tiny Accept-Language matcher (only two supported locales, so no full
 * RFC-4647 lookup). First subtag starting with "fr" -> fr, else en.
 * Note the prefix match also catches e.g. "frisian" -> fr; acceptable
 * given the two-locale set and that browsers send well-formed tags.
 */
export function parseAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return 'en'
  const first = header.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? ''
  return first.startsWith('fr') ? 'fr' : 'en'
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  currency: Currency
  setCurrency: (c: Currency) => void
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)

export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale
  children: ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(initial)
  const [currency, setCurrencyState] = useState<Currency>('EUR')

  // Post-mount: a stored preference overrides the Accept-Language default.
  useEffect(() => {
    const stored = localStorage.getItem('locale')
    if (stored === 'en' || stored === 'fr') {
      setLocaleState(stored)
    }
  }, [])

  // Post-mount: a stored currency overrides the EUR default.
  useEffect(() => {
    const stored = localStorage.getItem('currency')
    if (stored === 'EUR' || stored === 'USD' || stored === 'GBP') {
      setCurrencyState(stored)
    }
  }, [])

  // Keep <html lang> accurate for a11y when the locale changes client-side.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  function setLocale(next: Locale) {
    setLocaleState(next)
    localStorage.setItem('locale', next)
  }

  function setCurrency(next: Currency) {
    setCurrencyState(next)
    localStorage.setItem('currency', next)
  }

  return createElement(
    LocaleContext.Provider,
    { value: { locale, setLocale, currency, setCurrency } },
    children,
  )
}

export function useTranslation() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useTranslation must be used within a LocaleProvider')
  }
  const { locale } = ctx
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars)
  return { t, locale }
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return ctx
}

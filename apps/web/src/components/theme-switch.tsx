import { Sun, Moon, Monitor } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTheme } from '~/components/theme-provider'
import { useTranslation } from '~/i18n'
import { cn } from '~/lib/utils'

const OPTIONS: { value: 'light' | 'system' | 'dark'; icon: LucideIcon; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'settings.appearance.light' },
  { value: 'system', icon: Monitor, labelKey: 'settings.appearance.system' },
  { value: 'dark', icon: Moon, labelKey: 'settings.appearance.dark' },
]

/**
 * Segmented Light / System / Dark switch. Reflects the chosen *mode* (so
 * "System" can be selected, not just the resolved light/dark), and persists
 * via the theme provider. A group of toggle buttons (aria-pressed) rather than
 * a radiogroup, so each option is tab-reachable without roving tabindex.
 */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <div
      role="group"
      aria-label={t('settings.appearance.title')}
      className="inline-flex rounded-lg border bg-muted p-1"
    >
      {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-background text-foreground shadow-soft'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </button>
        )
      })}
    </div>
  )
}

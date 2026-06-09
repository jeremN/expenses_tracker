import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  RefreshCw,
  BarChart3,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { useTranslation } from '~/i18n'

const mobileNavItems = [
  { to: '/' as const, labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/transactions' as const, labelKey: 'nav.transactions', icon: ArrowLeftRight },
  { to: '/budgets' as const, labelKey: 'nav.budgets', icon: Target },
  { to: '/recurring' as const, labelKey: 'nav.recurring', icon: RefreshCw },
  { to: '/stats' as const, labelKey: 'nav.stats', icon: BarChart3 },
]

export function MobileNav({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background',
        className,
      )}
    >
      <div className="flex h-16 items-center justify-around">
        {mobileNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            className="flex flex-col items-center gap-1 px-2 py-1 text-muted-foreground transition-colors"
            activeProps={{
              className:
                'flex flex-col items-center gap-1 px-2 py-1 text-foreground',
            }}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

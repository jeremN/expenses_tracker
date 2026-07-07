import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ArrowLeftRight,
  RefreshCw,
  Target,
  TrendingUp,
  Wallet,
  Landmark,
  Upload,
  Tags,
  BarChart3,
  Settings,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { ThemeToggle } from '~/components/theme-toggle'
import { useTranslation } from '~/i18n'

const navItems = [
  { to: '/' as const, labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/transactions' as const, labelKey: 'nav.transactions', icon: ArrowLeftRight },
  { to: '/recurring' as const, labelKey: 'nav.recurring', icon: RefreshCw },
  { to: '/budgets' as const, labelKey: 'nav.budgets', icon: Target },
  { to: '/investments' as const, labelKey: 'nav.investments', icon: TrendingUp },
  { to: '/net-worth' as const, labelKey: 'nav.netWorth', icon: Wallet },
  { to: '/accounts' as const, labelKey: 'nav.accounts', icon: Landmark },
  { to: '/import' as const, labelKey: 'nav.import', icon: Upload },
  { to: '/categories' as const, labelKey: 'nav.categories', icon: Tags },
  { to: '/stats' as const, labelKey: 'nav.stats', icon: BarChart3 },
  { to: '/settings' as const, labelKey: 'nav.settings', icon: Settings },
]

export function Sidebar({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 w-60 flex-col border-r border-border bg-background',
        className,
      )}
    >
      <div className="flex h-14 items-center border-b border-border px-5">
        <span className="text-lg font-semibold tracking-tight">
          {t('common.appName')}
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            activeProps={{
              className:
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-accent text-foreground',
            }}
          >
            <item.icon className="h-4 w-4" />
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center justify-between px-3">
          <span className="text-xs text-muted-foreground">{t('common.theme')}</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

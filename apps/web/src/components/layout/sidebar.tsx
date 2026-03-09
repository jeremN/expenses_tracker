import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ArrowLeftRight,
  RefreshCw,
  TrendingUp,
  Upload,
  Tags,
  BarChart3,
} from 'lucide-react'
import { cn } from '~/lib/utils'

const navItems = [
  { to: '/' as const, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions' as const, label: 'Transactions', icon: ArrowLeftRight },
  { to: '/recurring' as const, label: 'Recurring', icon: RefreshCw },
  { to: '/investments' as const, label: 'Investments', icon: TrendingUp },
  { to: '/import' as const, label: 'Import', icon: Upload },
  { to: '/categories' as const, label: 'Categories', icon: Tags },
  { to: '/stats' as const, label: 'Stats', icon: BarChart3 },
]

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 w-60 flex-col border-r border-border bg-background',
        className,
      )}
    >
      <div className="flex h-14 items-center border-b border-border px-5">
        <span className="text-lg font-semibold tracking-tight">
          Expenses Tracker
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
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ArrowLeftRight,
  RefreshCw,
  Tags,
  BarChart3,
} from 'lucide-react'
import { cn } from '~/lib/utils'

const mobileNavItems = [
  { to: '/' as const, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions' as const, label: 'Transactions', icon: ArrowLeftRight },
  { to: '/recurring' as const, label: 'Recurring', icon: RefreshCw },
  { to: '/categories' as const, label: 'Categories', icon: Tags },
  { to: '/stats' as const, label: 'Stats', icon: BarChart3 },
]

export function MobileNav({ className }: { className?: string }) {
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
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

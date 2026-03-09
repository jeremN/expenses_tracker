import type { RecurringRule, Category } from '@tracker/shared'
import { Pencil, Trash2, Pause, Play } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { formatCents } from '~/lib/utils'

interface RecurringRuleWithCategory {
  recurring_rules: RecurringRule
  categories: Category | null
}

interface RecurringListProps {
  rules: RecurringRuleWithCategory[]
  onEdit: (rule: RecurringRule) => void
  onDelete: (rule: RecurringRule) => void
  onToggle: (rule: RecurringRule) => void
}

export function RecurringList({ rules, onEdit, onDelete, onToggle }: RecurringListProps) {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">No recurring rules yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first recurring rule to automate regular transactions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rules.map(({ recurring_rules: rule, categories: category }) => (
        <div
          key={rule.id}
          className={`flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm ${
            !rule.isActive ? 'opacity-60' : ''
          }`}
        >
          <div className="flex flex-1 items-center gap-4">
            {/* Description and category */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {rule.description || 'Untitled rule'}
                </p>
                <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                  {rule.isActive ? 'Active' : 'Paused'}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {category && (
                  <span className="flex items-center gap-1">
                    {category.color && (
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    {category.name}
                  </span>
                )}
                <span>Starts {rule.startDate}</span>
                {rule.endDate && <span>Ends {rule.endDate}</span>}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right">
              <p
                className={`text-lg font-semibold ${
                  rule.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {rule.type === 'income' ? '+' : '-'}${formatCents(rule.amount)}
              </p>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {rule.type === 'income' ? 'Income' : 'Expense'}
              </Badge>
              <Badge variant="secondary">
                {rule.frequency.charAt(0).toUpperCase() + rule.frequency.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="ml-4 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggle(rule)}
              aria-label={rule.isActive ? 'Pause rule' : 'Activate rule'}
            >
              {rule.isActive ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(rule)}
              aria-label="Edit rule"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(rule)}
              aria-label="Delete rule"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

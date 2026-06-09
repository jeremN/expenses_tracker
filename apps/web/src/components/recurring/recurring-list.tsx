import type { RecurringRule, Category } from '@tracker/shared'
import { Pencil, Trash2, Pause, Play } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Amount } from '~/components/ui/amount'
import { useTranslation } from '~/i18n'

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
  const { t } = useTranslation()

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">{t('recurring.empty.title')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('recurring.empty.subtitle')}
        </p>
      </div>
    )
  }

  const freqKey: Record<string, string> = {
    weekly: 'recurring.freq.weekly',
    monthly: 'recurring.freq.monthly',
    yearly: 'recurring.freq.yearly',
  }

  return (
    <div className="space-y-3">
      {rules.map(({ recurring_rules: rule, categories: category }) => (
        <div
          key={rule.id}
          className={`flex items-center justify-between rounded-lg border bg-card p-4 shadow-soft ${
            !rule.isActive ? 'opacity-60' : ''
          }`}
        >
          <div className="flex flex-1 items-center gap-4">
            {/* Description and category */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {rule.description || t('recurring.untitled')}
                </p>
                <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                  {rule.isActive ? t('recurring.status.active') : t('recurring.status.paused')}
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
                <span>{t('recurring.starts', { date: rule.startDate })}</span>
                {rule.endDate && <span>{t('recurring.ends', { date: rule.endDate })}</span>}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right">
              <Amount
                cents={rule.amount}
                tone={rule.type === 'income' ? 'income' : 'expense'}
                className="text-lg font-semibold"
              />
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {rule.type === 'income' ? t('common.income') : t('common.expense')}
              </Badge>
              <Badge variant="secondary">
                {t(freqKey[rule.frequency] ?? rule.frequency)}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="ml-4 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggle(rule)}
              aria-label={rule.isActive ? t('recurring.pause') : t('recurring.activate')}
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
              aria-label={t('recurring.editAction')}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(rule)}
              aria-label={t('recurring.deleteAction')}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

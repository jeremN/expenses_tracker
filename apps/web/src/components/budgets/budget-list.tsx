import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import type { BudgetOverviewItem } from '@tracker/shared'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Amount } from '~/components/ui/amount'
import { useFormat } from '~/lib/format'
import { useTranslation } from '~/i18n'
import { cn, parseToCents } from '~/lib/utils'

interface BudgetListProps {
  items: BudgetOverviewItem[]
  /** amountCents null clears the budget. */
  onSave: (categoryId: number, amountCents: number | null) => void | Promise<void>
}

export function BudgetList({ items, onSave }: BudgetListProps) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <BudgetRow key={item.categoryId} item={item} onSave={onSave} />
      ))}
    </ul>
  )
}

function BudgetRow({ item, onSave }: { item: BudgetOverviewItem; onSave: BudgetListProps['onSave'] }) {
  const { t } = useTranslation()
  const { formatMoney, currencySymbol } = useFormat()

  const initial = item.budget != null ? (item.budget / 100).toString() : ''
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)

  const hasBudget = item.budget != null
  const dirty = draft.trim() !== initial
  const pct = hasBudget && item.budget! > 0 ? item.spent / item.budget! : 0
  const over = hasBudget && item.spent > item.budget!

  async function persist(amountCents: number | null) {
    setSaving(true)
    try {
      await onSave(item.categoryId, amountCents)
    } finally {
      setSaving(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim()
    const cents = trimmed === '' ? null : parseToCents(trimmed)
    // Invalid or non-positive input clears the budget rather than erroring.
    await persist(cents !== null && Number.isFinite(cents) && cents > 0 ? cents : null)
  }

  async function clear() {
    setDraft('')
    await persist(null)
  }

  return (
    <li className="rounded-lg border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.categoryColor ?? 'var(--muted-foreground)' }}
          />
          {item.categoryName}
        </span>
        <span className="text-sm text-muted-foreground">
          <Amount cents={item.spent} className="font-medium text-foreground" />
          {hasBudget && ` / ${formatMoney(item.budget!)}`}
        </span>
      </div>

      {hasBudget && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500 ease-out',
              over ? 'bg-expense' : 'bg-primary',
            )}
            style={{ width: `${Math.min(pct, 1) * 100}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs">
          {!hasBudget ? (
            <span className="text-muted-foreground">{t('budgets.noBudget')}</span>
          ) : over ? (
            <span className="font-medium text-expense">
              {t('budgets.over', { amount: formatMoney(item.spent - item.budget!) })}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('budgets.remaining', { amount: formatMoney(item.budget! - item.spent) })}
            </span>
          )}
        </span>

        <form onSubmit={submit} className="flex items-center gap-2">
          <div className="relative w-32">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {currencySymbol}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('budgets.placeholder')}
              aria-label={`${t('budgets.placeholder')} — ${item.categoryName}`}
              className="h-9 pl-6 font-mono tabular-nums"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={!dirty || saving}>
            {t('common.save')}
          </Button>
          {hasBudget && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={clear}
              disabled={saving}
              aria-label={`${t('budgets.clearAction')} — ${item.categoryName}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </form>
      </div>
    </li>
  )
}

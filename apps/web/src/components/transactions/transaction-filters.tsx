import type { Category } from '@tracker/shared'
import { Search } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useTranslation } from '~/i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

export type TypeFilter = 'all' | 'income' | 'expense'

interface TransactionFiltersProps {
  search: string
  onSearchChange: (search: string) => void
  month: string
  onMonthChange: (month: string) => void
  categoryId: string
  onCategoryChange: (categoryId: string) => void
  typeFilter: TypeFilter
  onTypeChange: (type: TypeFilter) => void
  categories: Category[]
}

export function TransactionFilters({
  search,
  onSearchChange,
  month,
  onMonthChange,
  categoryId,
  onCategoryChange,
  typeFilter,
  onTypeChange,
  categories,
}: TransactionFiltersProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Description search */}
      <div className="relative w-full sm:w-64">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('transactions.searchPlaceholder')}
          aria-label={t('transactions.searchPlaceholder')}
          className="pl-9"
        />
      </div>

      {/* Month picker */}
      <Input
        type="month"
        value={month}
        onChange={(e) => onMonthChange(e.target.value)}
        className="w-44"
      />

      {/* Category filter */}
      <Select value={categoryId} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t('common.allCategories')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.allCategories')}</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={String(cat.id)}>
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: cat.color ?? '#6b7280' }}
                />
                {cat.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type toggle */}
      <div className="flex rounded-md border">
        {(['all', 'income', 'expense'] as const).map((type) => (
          <Button
            key={type}
            variant={typeFilter === type ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none first:rounded-l-md last:rounded-r-md"
            onClick={() => onTypeChange(type)}
          >
            {type === 'all'
              ? t('common.all')
              : type === 'income'
                ? t('common.income')
                : t('common.expense')}
          </Button>
        ))}
      </div>
    </div>
  )
}

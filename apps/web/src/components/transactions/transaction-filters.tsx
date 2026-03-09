import type { Category } from '@tracker/shared'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

export type TypeFilter = 'all' | 'income' | 'expense'

interface TransactionFiltersProps {
  month: string
  onMonthChange: (month: string) => void
  categoryId: string
  onCategoryChange: (categoryId: string) => void
  typeFilter: TypeFilter
  onTypeChange: (type: TypeFilter) => void
  categories: Category[]
}

export function TransactionFilters({
  month,
  onMonthChange,
  categoryId,
  onCategoryChange,
  typeFilter,
  onTypeChange,
  categories,
}: TransactionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
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
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
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
            {type === 'all' ? 'All' : type === 'income' ? 'Income' : 'Expense'}
          </Button>
        ))}
      </div>
    </div>
  )
}

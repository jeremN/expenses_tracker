import type { Category } from '@tracker/shared'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/i18n'
import { CategoryIcon } from '~/lib/category-icon'

interface CategoryListProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
  const { t } = useTranslation()

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">{t('categories.empty.title')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('categories.empty.subtitle')}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <div
          key={category.id}
          className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: (category.color ?? '#6b7280') + '20', color: category.color ?? '#6b7280' }}
            >
              <CategoryIcon name={category.icon} className="h-4 w-4" />
            </span>
            <p className="font-medium">{category.name}</p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(category)}
              aria-label={t('categories.editAction', { name: category.name })}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(category)}
              aria-label={t('categories.deleteAction', { name: category.name })}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

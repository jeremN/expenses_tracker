import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { createCategory, updateCategory, deleteCategory } from '@tracker/db'
import { z } from 'zod'
import { createCategorySchema, updateCategorySchema, toAppError } from '@tracker/shared'
import type { Category, CreateCategory } from '@tracker/shared'
import { Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { CategoryForm } from '~/components/categories/category-form'
import { CategoryList } from '~/components/categories/category-list'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'
import { getServerCategories } from '~/server/shared-fns'
import { useTranslation } from '~/i18n'
import { toast } from 'sonner'
import { translateApiError } from '~/i18n/errors'

// --- Server Functions ---

const createServerCategory = createServerFn({ method: 'POST' })
  .inputValidator(createCategorySchema)
  .handler(async ({ data }) => {
    try {
      const db = getDB()
      return await createCategory(db, data)
    } catch (e) {
      throw toAppError(e)
    }
  })

const updateServerCategory = createServerFn({ method: 'POST' })
  .inputValidator(updateCategorySchema.extend({ id: z.number() }))
  .handler(async ({ data }) => {
    try {
      const { id, ...rest } = data
      const db = getDB()
      return await updateCategory(db, id, rest)
    } catch (e) {
      throw toAppError(e)
    }
  })

const deleteServerCategory = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const db = getDB()
    await deleteCategory(db, data.id)
    return { success: true }
  })

// --- Route ---

export const Route = createFileRoute('/categories')({
  loader: () => getServerCategories(),
  component: CategoriesPage,
  pendingComponent: CategoriesSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function CategoriesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  )
}

// --- Page Component ---

function CategoriesPage() {
  const { t } = useTranslation()
  const categories = Route.useLoaderData() as Category[]

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()

  function openCreate() {
    setEditingCategory(null)
    setFormOpen(true)
  }

  function openEdit(category: Category) {
    setEditingCategory(category)
    setFormOpen(true)
  }

  async function handleSubmit(data: CreateCategory) {
    setIsSubmitting(true)
    try {
      if (editingCategory) {
        await updateServerCategory({ data: { ...data, id: editingCategory.id } })
        toast.success(t('toast.updated'))
      } else {
        await createServerCategory({ data })
        toast.success(t('toast.created'))
      }
      setFormOpen(false)
      setEditingCategory(null)
      router.invalidate()
    } catch (error) {
      console.error('Failed to save category:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      await deleteServerCategory({ data: { id: deleteTarget.id } })
      toast.success(t('toast.deleted'))
      setDeleteTarget(null)
      router.invalidate()
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error(translateApiError(error, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('categories.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('categories.subtitle')}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('categories.add')}
        </Button>
      </div>

      {/* Category List */}
      <CategoryList
        categories={categories}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => {
        if (!open) {
          setFormOpen(false)
          setEditingCategory(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('categories.edit.title') : t('categories.new.title')}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? t('categories.edit.subtitle')
                : t('categories.new.subtitle')}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            key={editingCategory?.id ?? 'new'}
            defaultValues={editingCategory ?? undefined}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => {
        if (!open) setDeleteTarget(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('categories.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('categories.delete.confirm', { name: deleteTarget?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.deleting') : t('common.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

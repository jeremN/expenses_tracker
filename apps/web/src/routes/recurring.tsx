import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import {
  getRecurringRules,
  getCategories,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
} from '@tracker/db'
import { z } from 'zod'
import {
  createRecurringRuleSchema,
  updateRecurringRuleSchema,
} from '@tracker/shared'
import type { RecurringRule, CreateRecurringRule, Category } from '@tracker/shared'
import { Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { RecurringForm } from '~/components/recurring/recurring-form'
import { RecurringList } from '~/components/recurring/recurring-list'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'

// --- Server Functions ---

const getServerRecurringRules = createServerFn({ method: 'GET' }).handler(async () => {
  const db = getDB()
  const [rules, categories] = await Promise.all([
    getRecurringRules(db),
    getCategories(db),
  ])
  return { rules, categories }
})

const createServerRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(createRecurringRuleSchema)
  .handler(async ({ data }) => {
    const db = getDB()
    return createRecurringRule(db, data)
  })

const updateServerRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(updateRecurringRuleSchema.extend({ id: z.number() }))
  .handler(async ({ data }) => {
    const { id, ...rest } = data
    const db = getDB()
    return updateRecurringRule(db, id, rest)
  })

const deleteServerRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const db = getDB()
    await deleteRecurringRule(db, data.id)
    return { success: true }
  })

const toggleServerRecurringRule = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.number(), isActive: z.boolean() }))
  .handler(async ({ data }) => {
    const db = getDB()
    return updateRecurringRule(db, data.id, { isActive: data.isActive })
  })

// --- Route ---

export const Route = createFileRoute('/recurring')({
  loader: () => getServerRecurringRules(),
  component: RecurringPage,
  pendingComponent: RecurringSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function RecurringSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  )
}

// --- Page Component ---

function RecurringPage() {
  const { rules, categories } = Route.useLoaderData()

  const [formOpen, setFormOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecurringRule | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()

  function openCreate() {
    setEditingRule(null)
    setFormOpen(true)
  }

  function openEdit(rule: RecurringRule) {
    setEditingRule(rule)
    setFormOpen(true)
  }

  async function handleSubmit(data: CreateRecurringRule) {
    setIsSubmitting(true)
    try {
      if (editingRule) {
        await updateServerRecurringRule({ data: { ...data, id: editingRule.id } })
      } else {
        await createServerRecurringRule({ data })
      }
      setFormOpen(false)
      setEditingRule(null)
      router.invalidate()
    } catch (error) {
      console.error('Failed to save recurring rule:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      await deleteServerRecurringRule({ data: { id: deleteTarget.id } })
      setDeleteTarget(null)
      router.invalidate()
    } catch (error) {
      console.error('Failed to delete recurring rule:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggle(rule: RecurringRule) {
    try {
      await toggleServerRecurringRule({
        data: { id: rule.id, isActive: !rule.isActive },
      })
      router.invalidate()
    } catch (error) {
      console.error('Failed to toggle recurring rule:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recurring</h1>
          <p className="text-sm text-muted-foreground">
            Manage your recurring income and expense rules.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {/* Recurring Rules List */}
      <RecurringList
        rules={rules}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onToggle={handleToggle}
      />

      {/* Create / Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false)
            setEditingRule(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Rule' : 'New Recurring Rule'}
            </DialogTitle>
            <DialogDescription>
              {editingRule
                ? 'Update the details for this recurring rule.'
                : 'Create a new recurring rule for automatic transactions.'}
            </DialogDescription>
          </DialogHeader>
          <RecurringForm
            key={editingRule?.id ?? 'new'}
            defaultValues={editingRule ?? undefined}
            categories={categories as Category[]}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Recurring Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate "
              {deleteTarget?.description || 'this rule'}"? The rule will be
              paused and can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

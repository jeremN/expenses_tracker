import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Category, TransactionType } from '@tracker/shared'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'
import { parseToCents } from '~/lib/utils'
import { useTranslation } from '~/i18n'

// Form-level schema works with a decimal string for amount
const transactionFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.string().min(1, 'Amount is required').refine(
    (val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0
    },
    { message: 'Must be a positive number' },
  ),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required'),
  categoryId: z.string().optional(),
})

type TransactionFormValues = z.infer<typeof transactionFormSchema>

interface TransactionFormProps {
  categories: Category[]
  onSubmit: (data: {
    type: TransactionType
    amount: number
    description?: string
    date: string
    categoryId?: number
  }) => void
  isSubmitting?: boolean
  defaultValues?: {
    type: TransactionType
    amount: number
    description?: string | null
    date: string
    categoryId?: number | null
  }
}

export function TransactionForm({ categories, onSubmit, isSubmitting, defaultValues }: TransactionFormProps) {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const isEditing = !!defaultValues

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: defaultValues?.type ?? 'expense',
      amount: defaultValues ? (defaultValues.amount / 100).toString() : '',
      description: defaultValues?.description ?? '',
      date: defaultValues?.date ?? today,
      categoryId: defaultValues?.categoryId ? String(defaultValues.categoryId) : undefined,
    },
  })

  const currentType = form.watch('type')

  function handleFormSubmit(values: TransactionFormValues) {
    onSubmit({
      type: values.type,
      amount: parseToCents(values.amount),
      description: values.description || undefined,
      date: values.date,
      categoryId: values.categoryId && values.categoryId !== 'none'
        ? Number(values.categoryId)
        : undefined,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Type toggle */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('transactions.field.type')}</FormLabel>
              <div className="flex rounded-md border">
                <Button
                  type="button"
                  variant={field.value === 'expense' ? 'default' : 'ghost'}
                  className="flex-1 rounded-none rounded-l-md"
                  onClick={() => field.onChange('expense')}
                >
                  {t('common.expense')}
                </Button>
                <Button
                  type="button"
                  variant={field.value === 'income' ? 'default' : 'ghost'}
                  className="flex-1 rounded-none rounded-r-md"
                  onClick={() => field.onChange('income')}
                >
                  {t('common.income')}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('transactions.field.amount')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pl-7"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('transactions.field.date')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('transactions.field.description')}</FormLabel>
              <FormControl>
                <Input placeholder={t('transactions.form.descriptionPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('transactions.field.category')}</FormLabel>
              <Select
                value={field.value ?? 'none'}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('transactions.form.selectCategory')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">{t('common.noCategory')}</SelectItem>
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
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t('common.saving')
              : isEditing
                ? t('transactions.form.saveChanges')
                : currentType === 'income'
                  ? t('transactions.form.addIncome')
                  : t('transactions.form.addExpense')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

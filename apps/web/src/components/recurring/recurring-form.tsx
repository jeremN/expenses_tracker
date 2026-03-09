import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createRecurringRuleSchema } from '@tracker/shared'
import type { CreateRecurringRule, RecurringRule, Category } from '@tracker/shared'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { parseToCents, formatCents } from '~/lib/utils'

interface RecurringFormProps {
  defaultValues?: RecurringRule
  categories: Category[]
  onSubmit: (data: CreateRecurringRule) => void
  isSubmitting?: boolean
}

export function RecurringForm({
  defaultValues,
  categories,
  onSubmit,
  isSubmitting,
}: RecurringFormProps) {
  const form = useForm<CreateRecurringRule>({
    resolver: zodResolver(createRecurringRuleSchema),
    defaultValues: {
      type: defaultValues?.type ?? 'expense',
      amount: defaultValues?.amount ?? 0,
      description: defaultValues?.description ?? '',
      categoryId: defaultValues?.categoryId ?? undefined,
      frequency: defaultValues?.frequency ?? 'monthly',
      startDate: defaultValues?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: defaultValues?.endDate ?? undefined,
    },
  })

  // Display amount in dollars for user input
  const amountInDollars = defaultValues ? formatCents(defaultValues.amount) : ''

  function handleFormSubmit(data: CreateRecurringRule) {
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  defaultValue={amountInDollars}
                  onChange={(e) => {
                    const cents = parseToCents(e.target.value)
                    field.onChange(cents)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Monthly rent"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val === '_none' ? undefined : Number(val))}
                defaultValue={field.value?.toString() ?? '_none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      <span className="flex items-center gap-2">
                        {cat.color && (
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
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

        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date (optional)</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving...'
              : defaultValues
                ? 'Update Rule'
                : 'Create Rule'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

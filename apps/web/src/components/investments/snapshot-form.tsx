import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { parseToCents } from '~/lib/utils'
import type { CreateInvestmentSnapshot } from '@tracker/shared'
import { useTranslation } from '~/i18n'

const formSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalValue: z.string().min(1, 'error.form.totalValueRequired'),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface SnapshotFormProps {
  onSubmit: (data: CreateInvestmentSnapshot) => void
  isSubmitting?: boolean
}

function todayString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function SnapshotForm({ onSubmit, isSubmitting }: SnapshotFormProps) {
  const { t } = useTranslation()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: todayString(),
      totalValue: '',
      note: '',
    },
  })

  function handleSubmit(values: FormValues) {
    const cents = parseToCents(values.totalValue)
    if (cents <= 0 || Number.isNaN(cents)) {
      form.setError('totalValue', { message: 'error.form.positiveNumber' })
      return
    }
    onSubmit({
      date: values.date,
      totalValue: cents,
      note: values.note || undefined,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

        <FormField
          control={form.control}
          name="totalValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('investments.form.totalValue')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="14750.00"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('investments.form.note')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('investments.form.notePlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('investments.addSnapshot')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

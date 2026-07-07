import { useForm } from 'react-hook-form'
import { useZodResolver } from '~/i18n/use-zod-resolver'
import { z } from 'zod'
import type { CreateHolding } from '@tracker/shared'
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
import { useTranslation } from '~/i18n'

const formSchema = z.object({
  name: z.string().min(1, 'error.form.nameRequired'),
  symbol: z.string().optional(),
  quantity: z.string().optional(),
  marketValue: z.string().min(1, 'error.form.marketValueRequired'),
})

type FormValues = z.infer<typeof formSchema>

interface HoldingFormProps {
  accountId: number
  onSubmit: (data: CreateHolding) => void
  isSubmitting?: boolean
}

export function HoldingForm({ accountId, onSubmit, isSubmitting }: HoldingFormProps) {
  const { t } = useTranslation()
  const form = useForm<FormValues>({
    resolver: useZodResolver(formSchema),
    defaultValues: { name: '', symbol: '', quantity: '', marketValue: '' },
  })

  function handleSubmit(values: FormValues) {
    const marketValue = parseToCents(values.marketValue)
    if (marketValue < 0 || Number.isNaN(marketValue)) {
      form.setError('marketValue', { message: 'error.form.positiveNumber' })
      return
    }
    const quantity = values.quantity ? Number(values.quantity) : undefined
    onSubmit({
      accountId,
      name: values.name,
      symbol: values.symbol || undefined,
      quantity: Number.isFinite(quantity) ? quantity : undefined,
      marketValue,
    })
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-wrap items-end gap-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="min-w-32 flex-1">
              <FormLabel>{t('accounts.holdings.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('accounts.holdings.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem className="w-24">
              <FormLabel>{t('accounts.holdings.quantity')}</FormLabel>
              <FormControl>
                <Input type="number" step="any" min="0" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="marketValue"
          render={({ field }) => (
            <FormItem className="w-32">
              <FormLabel>{t('accounts.holdings.marketValue')}</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {t('common.add')}
        </Button>
      </form>
    </Form>
  )
}

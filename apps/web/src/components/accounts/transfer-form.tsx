import { useForm } from 'react-hook-form'
import { useZodResolver } from '~/i18n/use-zod-resolver'
import { z } from 'zod'
import type { Account, CreateTransfer } from '@tracker/shared'
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
import { parseToCents } from '~/lib/utils'
import { useTranslation } from '~/i18n'

// Radix Select forbids empty-string item values, so an absent (external) leg is
// carried by this sentinel and mapped back to null on submit.
const EXTERNAL = 'external'

const formSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.string().min(1, 'error.form.amountRequired'),
  date: z.string().optional(),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface TransferFormProps {
  accounts: Account[]
  onSubmit: (data: CreateTransfer) => void
  isSubmitting?: boolean
}

export function TransferForm({ accounts, onSubmit, isSubmitting }: TransferFormProps) {
  const { t } = useTranslation()
  // Only manual, active accounts can be a leg (tracked accounts are derived from
  // holdings and are rejected server-side).
  const legAccounts = accounts.filter((a) => a.isActive && a.valuation === 'manual')

  const form = useForm<FormValues>({
    resolver: useZodResolver(formSchema),
    defaultValues: {
      fromAccountId: legAccounts[0] ? String(legAccounts[0].id) : EXTERNAL,
      toAccountId: legAccounts[1] ? String(legAccounts[1].id) : EXTERNAL,
      amount: '',
      date: '',
      note: '',
    },
  })

  function handleSubmit(values: FormValues) {
    const from = values.fromAccountId === EXTERNAL ? null : Number(values.fromAccountId)
    const to = values.toAccountId === EXTERNAL ? null : Number(values.toAccountId)

    if (from == null && to == null) {
      form.setError('toAccountId', { message: 'error.form.transferNoLegs' })
      return
    }
    if (from != null && from === to) {
      form.setError('toAccountId', { message: 'error.form.transferSameAccount' })
      return
    }
    const amount = parseToCents(values.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      form.setError('amount', { message: 'error.form.positiveNumber' })
      return
    }

    onSubmit({
      amount,
      fromAccountId: from,
      toAccountId: to,
      date: values.date || undefined,
      note: values.note || undefined,
    })
    form.reset()
  }

  const legField = (name: 'fromAccountId' | 'toAccountId', label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={EXTERNAL}>{t('transfers.external')}</SelectItem>
              {legAccounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {legField('fromAccountId', t('transfers.from'))}
          {legField('toAccountId', t('transfers.to'))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('transfers.amount')}</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('transfers.date')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('transfers.note')}</FormLabel>
              <FormControl>
                <Input placeholder={t('transfers.notePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted-foreground">{t('transfers.hint')}</p>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('transfers.record')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

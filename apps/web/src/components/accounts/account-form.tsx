import { useForm } from 'react-hook-form'
import { useZodResolver } from '~/i18n/use-zod-resolver'
import { createAccountSchema } from '@tracker/shared'
import type { CreateAccount, Account, AccountType } from '@tracker/shared'
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

export const ACCOUNT_TYPES: AccountType[] = [
  'cash', 'checking', 'savings', 'brokerage', 'retirement',
  'real_estate', 'crypto', 'vehicle', 'loan', 'credit_card', 'other',
]

interface AccountFormProps {
  defaultValues?: Account
  onSubmit: (data: CreateAccount) => void
  isSubmitting?: boolean
}

export function AccountForm({ defaultValues, onSubmit, isSubmitting }: AccountFormProps) {
  const { t } = useTranslation()
  const form = useForm<CreateAccount>({
    resolver: useZodResolver(createAccountSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      kind: defaultValues?.kind ?? 'asset',
      type: defaultValues?.type ?? 'cash',
      valuation: defaultValues?.valuation ?? 'manual',
      currentValue: defaultValues?.currentValue ?? 0,
      institution: defaultValues?.institution ?? undefined,
    },
  })

  // Cents rendered as a plain decimal string for the number input.
  const valueInMajor = defaultValues ? (defaultValues.currentValue / 100).toString() : ''
  const isTracked = form.watch('valuation') === 'tracked'

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('accounts.form.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('accounts.form.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accounts.form.kind')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="asset">{t('accounts.kind.asset')}</SelectItem>
                    <SelectItem value="liability">{t('accounts.kind.liability')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('accounts.form.type')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`accounts.type.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="valuation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('accounts.form.valuation')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="manual">{t('accounts.valuation.manual')}</SelectItem>
                  <SelectItem value="tracked">{t('accounts.valuation.tracked')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isTracked ? t('accounts.valuation.trackedHint') : t('accounts.valuation.manualHint')}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentValue"
          render={() => (
            <FormItem>
              <FormLabel>{t('accounts.form.currentValue')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  disabled={isTracked}
                  defaultValue={valueInMajor}
                  onChange={(e) => form.setValue('currentValue', parseToCents(e.target.value) || 0)}
                />
              </FormControl>
              {isTracked && (
                <p className="text-xs text-muted-foreground">{t('accounts.form.currentValueTracked')}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="institution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('accounts.form.institution')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('accounts.form.institutionPlaceholder')}
                  {...field}
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
              ? t('common.saving')
              : defaultValues
                ? t('accounts.form.update')
                : t('accounts.form.create')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

import { useForm } from 'react-hook-form'
import { useZodResolver } from '~/i18n/use-zod-resolver'
import { createCategorySchema } from '@tracker/shared'
import type { CreateCategory, Category } from '@tracker/shared'
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
import { useTranslation } from '~/i18n'

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#78716c', // stone
]

interface CategoryFormProps {
  defaultValues?: Category
  onSubmit: (data: CreateCategory) => void
  isSubmitting?: boolean
}

export function CategoryForm({ defaultValues, onSubmit, isSubmitting }: CategoryFormProps) {
  const { t } = useTranslation()
  const form = useForm<CreateCategory>({
    resolver: useZodResolver(createCategorySchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      color: defaultValues?.color ?? '#3b82f6',
      icon: defaultValues?.icon ?? '',
    },
  })

  const selectedColor = form.watch('color')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('categories.form.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('categories.form.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('categories.form.color')}</FormLabel>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="h-8 w-8 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: color,
                        borderColor: selectedColor === color ? 'white' : 'transparent',
                        boxShadow: selectedColor === color ? `0 0 0 2px ${color}` : 'none',
                      }}
                      onClick={() => field.onChange(color)}
                    />
                  ))}
                </div>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      className="h-10 w-14 cursor-pointer p-1"
                      value={field.value ?? '#3b82f6'}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                    <Input
                      placeholder="#3b82f6"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('categories.form.icon')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('categories.form.iconPlaceholder')}
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
            {isSubmitting ? t('common.saving') : defaultValues ? t('categories.form.update') : t('categories.form.create')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

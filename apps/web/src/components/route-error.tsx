import { Button } from '~/components/ui/button'
import { useTranslation } from '~/i18n'

export function RouteError({ error }: { error: Error }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">
          {t('error.title')}
        </h2>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={() => window.location.reload()}>{t('error.tryAgain')}</Button>
      </div>
    </div>
  )
}

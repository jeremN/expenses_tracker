import { Button } from '~/components/ui/button'
import { useTranslation } from '~/i18n'
import { translateApiError } from '~/i18n/errors'

export function RouteError({ error }: { error: Error }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-destructive">
          {t('error.title')}
        </h2>
        <p className="text-muted-foreground">{translateApiError(error, t)}</p>
        {import.meta.env.DEV && error?.message && (
          <details className="text-left text-xs text-muted-foreground">
            <summary>Details (dev only)</summary>
            <pre className="whitespace-pre-wrap">{error.message}</pre>
          </details>
        )}
        <Button onClick={() => window.location.reload()}>
          {t('error.tryAgain')}
        </Button>
      </div>
    </div>
  )
}

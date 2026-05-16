import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Download, Loader2 } from 'lucide-react'
import { useTranslation, useLocale, type Locale } from '~/i18n'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { t } = useTranslation()
  const { locale, setLocale } = useLocale()
  const [isPreparing, setIsPreparing] = useState(false)

  function handleExport() {
    setIsPreparing(true)
    window.location.href = '/api/export'
    setTimeout(() => setIsPreparing(false), 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language.title')}</CardTitle>
          <CardDescription>{t('settings.language.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={locale}
            onValueChange={(v) => setLocale(v as Locale)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.export.title')}</CardTitle>
          <CardDescription>{t('settings.export.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isPreparing}>
            {isPreparing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('settings.export.preparing')}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t('settings.export.button')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

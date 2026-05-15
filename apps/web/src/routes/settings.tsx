import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const [isPreparing, setIsPreparing] = useState(false)

  function handleExport() {
    setIsPreparing(true)
    // Anchor-style download via navigation. The Content-Disposition: attachment
    // header on /api/export makes the browser save the file rather than render
    // the response. No reliable signal for download completion — clear the
    // spinner after 1s so it doesn't stick.
    window.location.href = '/api/export'
    setTimeout(() => setIsPreparing(false), 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your data and app preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export data</CardTitle>
          <CardDescription>
            Download a zip containing every table as CSV. For backup or migration.
            Amounts are stored as integer cents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isPreparing}>
            {isPreparing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing export…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export all data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

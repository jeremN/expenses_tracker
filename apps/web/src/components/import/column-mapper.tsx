import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'

import { useTranslation } from '~/i18n'

type ColumnRole = 'date' | 'description' | 'amount' | 'debit' | 'credit' | 'skip'

const ROLE_OPTIONS: { value: ColumnRole; labelKey: string }[] = [
  { value: 'date', labelKey: 'transactions.field.date' },
  { value: 'description', labelKey: 'transactions.field.description' },
  { value: 'amount', labelKey: 'transactions.field.amount' },
  { value: 'debit', labelKey: 'import.role.debit' },
  { value: 'credit', labelKey: 'import.role.credit' },
  { value: 'skip', labelKey: 'import.role.skip' },
]

interface ColumnMapperProps {
  headers: string[]
  sampleRows: Record<string, string>[]
  detectedMapping: Record<string, string>
  onConfirm: (mapping: Record<string, string>) => void
  onBack: () => void
}

export function ColumnMapper({
  headers,
  sampleRows,
  detectedMapping,
  onConfirm,
  onBack,
}: ColumnMapperProps) {
  const { t } = useTranslation()
  // Build initial role assignments from detected mapping
  const [roles, setRoles] = useState<Record<string, ColumnRole>>(() => {
    const initial: Record<string, ColumnRole> = {}
    for (const header of headers) {
      initial[header] = 'skip'
    }
    // Apply detected mapping
    for (const [role, headerName] of Object.entries(detectedMapping)) {
      if (headerName && initial[headerName] !== undefined) {
        initial[headerName] = role as ColumnRole
      }
    }
    return initial
  })

  const [error, setError] = useState<string | null>(null)

  // Validate whenever roles change
  useEffect(() => {
    setError(null)
  }, [roles])

  function setRole(header: string, role: ColumnRole) {
    setRoles((prev) => ({ ...prev, [header]: role }))
  }

  function handleConfirm() {
    // Build mapping from roles
    const mapping: Record<string, string> = {}
    for (const [header, role] of Object.entries(roles)) {
      if (role !== 'skip') {
        mapping[role] = header
      }
    }

    // Validate: must have date and either amount or (debit + credit)
    if (!mapping.date) {
      setError(t('import.map.errDate'))
      return
    }
    if (!mapping.amount && !(mapping.debit && mapping.credit)) {
      setError(t('import.map.errAmount'))
      return
    }

    onConfirm(mapping)
  }

  // Show at most 3 sample rows for preview
  const preview = sampleRows.slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('import.step.mapping')}</CardTitle>
        <CardDescription>
          {t('import.map.desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h} className="min-w-[160px]">
                    <div className="space-y-2">
                      <span className="block text-xs font-medium truncate" title={h}>
                        {h}
                      </span>
                      <Select
                        value={roles[h]}
                        onValueChange={(v) => setRole(h, v as ColumnRole)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {t(opt.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row, i) => (
                <TableRow key={i}>
                  {headers.map((h) => (
                    <TableCell key={h} className="text-xs truncate max-w-[200px]">
                      {row[h] ?? ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            {t('common.back')}
          </Button>
          <Button onClick={handleConfirm}>
            {t('import.continue')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

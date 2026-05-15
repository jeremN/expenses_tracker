import { useState, useMemo } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { cn, formatCents } from '~/lib/utils'
import type { ParsedRow } from '~/server/parsers/csv'

interface DuplicateInfo {
  date: string
  amount: number
}

interface CategorySuggestion {
  description: string
  categoryId: number
  categoryName: string
}

interface PreviewTableProps {
  rows: ParsedRow[]
  duplicates: DuplicateInfo[]
  categorySuggestions: CategorySuggestion[]
  onImport: (selectedIndices: number[]) => void
  onBack: () => void
  isImporting?: boolean
}

export function PreviewTable({
  rows,
  duplicates,
  categorySuggestions,
  onImport,
  onBack,
  isImporting,
}: PreviewTableProps) {
  const [selected, setSelected] = useState<Set<number>>(() => {
    return new Set(rows.map((_, i) => i))
  })

  // Build a set of duplicate keys for quick lookup
  const duplicateKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const d of duplicates) {
      keys.add(`${d.date}:${d.amount}`)
    }
    return keys
  }, [duplicates])

  // Build a map of description -> suggested category
  const suggestionMap = useMemo(() => {
    const map = new Map<string, CategorySuggestion>()
    for (const s of categorySuggestions) {
      map.set(s.description.toLowerCase(), s)
    }
    return map
  }, [categorySuggestions])

  function toggleRow(index: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map((_, i) => i)))
    }
  }

  function handleImport() {
    onImport(Array.from(selected).sort((a, b) => a - b))
  }

  const selectedCount = selected.size
  const duplicateCount = rows.filter((r) =>
    duplicateKeys.has(`${r.date}:${r.amount}`),
  ).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Preview & Import</CardTitle>
        <CardDescription>
          {selectedCount} of {rows.length} rows selected.
          {duplicateCount > 0 && (
            <span className="text-amber-600">
              {' '}{duplicateCount} potential duplicate{duplicateCount !== 1 ? 's' : ''} detected.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    checked={selected.size === rows.length}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => {
                const isDuplicate = duplicateKeys.has(`${row.date}:${row.amount}`)
                const suggestion = suggestionMap.get(row.description.toLowerCase())
                const isIncome = row.amount > 0

                return (
                  <TableRow
                    key={i}
                    className={cn(
                      !selected.has(i) && 'opacity-50',
                      isDuplicate && 'bg-amber-50 dark:bg-amber-950/20',
                    )}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={() => toggleRow(i)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {row.date}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm" title={row.description}>
                      {row.description}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right text-sm font-medium whitespace-nowrap',
                        isIncome ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {isIncome ? '+' : ''}{formatCents(row.amount)}
                    </TableCell>
                    <TableCell>
                      {suggestion && (
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.categoryName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isDuplicate && (
                        <span title="Possible duplicate: a transaction with the same date and amount already exists">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isImporting}>
            Back
          </Button>
          <Button onClick={handleImport} disabled={isImporting || selectedCount === 0}>
            {isImporting ? (
              'Importing...'
            ) : (
              <>
                <Check className="h-4 w-4" />
                Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

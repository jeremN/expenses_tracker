import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { createTransaction, createBankImport, getTransactions, getCategories } from '@tracker/db'
import { parseCSV, detectColumns, type ParsedRow, type ParseResult } from '~/server/parsers/csv'
import { FileUpload } from '~/components/import/file-upload'
import { ColumnMapper } from '~/components/import/column-mapper'
import { PreviewTable } from '~/components/import/preview-table'
import { Check, Upload, Columns, Eye } from 'lucide-react'
import { cn } from '~/lib/utils'
import { RouteError } from '~/components/route-error'

// --- Server Functions ---

const parseFile = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { content: string; mapping?: Record<string, string> }) => d,
  )
  .handler(async ({ data }) => {
    return parseCSV(data.content, data.mapping)
  })

const checkDuplicates = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { rows: Array<{ date: string; amount: number }> }) => d,
  )
  .handler(async ({ data }) => {
    const db = getDB()
    const allTransactions = await getTransactions(db)

    // Build a lookup set from existing transactions
    const existing = new Set<string>()
    for (const row of allTransactions) {
      const tx = row.transactions
      // Amount in DB is always positive; type determines sign
      const signedAmount = tx.type === 'income' ? tx.amount : -tx.amount
      existing.add(`${tx.date}:${signedAmount}`)
    }

    // Return rows that match
    const duplicates: Array<{ date: string; amount: number }> = []
    for (const row of data.rows) {
      if (existing.has(`${row.date}:${row.amount}`)) {
        duplicates.push(row)
      }
    }

    return duplicates
  })

const suggestCategories = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { descriptions: string[] }) => d,
  )
  .handler(async ({ data }) => {
    const db = getDB()
    const [allTransactions, categories] = await Promise.all([
      getTransactions(db),
      getCategories(db),
    ])

    // Build map of description (lowercase) -> most common categoryId
    const descCategoryCount = new Map<string, Map<number, number>>()
    for (const row of allTransactions) {
      const tx = row.transactions
      if (!tx.description || !tx.categoryId) continue
      const desc = tx.description.toLowerCase()
      if (!descCategoryCount.has(desc)) {
        descCategoryCount.set(desc, new Map())
      }
      const counts = descCategoryCount.get(desc)!
      counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1)
    }

    // Build category lookup
    const categoryMap = new Map<number, string>()
    for (const c of categories) {
      categoryMap.set(c.id, c.name)
    }

    // For each unique description, find the best category match
    const suggestions: Array<{
      description: string
      categoryId: number
      categoryName: string
    }> = []

    const uniqueDescs = [...new Set(data.descriptions.map((d) => d.toLowerCase()))]
    for (const desc of uniqueDescs) {
      // Exact match first
      if (descCategoryCount.has(desc)) {
        const counts = descCategoryCount.get(desc)!
        let bestId = 0
        let bestCount = 0
        for (const [catId, count] of counts) {
          if (count > bestCount) {
            bestCount = count
            bestId = catId
          }
        }
        if (bestId && categoryMap.has(bestId)) {
          suggestions.push({
            description: desc,
            categoryId: bestId,
            categoryName: categoryMap.get(bestId)!,
          })
          continue
        }
      }

      // Partial match: check if any existing description contains the import description or vice versa
      let found = false
      for (const [existingDesc, counts] of descCategoryCount) {
        if (
          existingDesc.includes(desc) ||
          desc.includes(existingDesc)
        ) {
          let bestId = 0
          let bestCount = 0
          for (const [catId, count] of counts) {
            if (count > bestCount) {
              bestCount = count
              bestId = catId
            }
          }
          if (bestId && categoryMap.has(bestId)) {
            suggestions.push({
              description: desc,
              categoryId: bestId,
              categoryName: categoryMap.get(bestId)!,
            })
            found = true
            break
          }
        }
      }
    }

    return suggestions
  })

const importTransactions = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      transactions: Array<{
        date: string
        description: string
        amount: number
        categoryId?: number
      }>
      filename: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const db = getDB()
    let imported = 0

    for (const tx of data.transactions) {
      const isIncome = tx.amount > 0
      await createTransaction(db, {
        type: isIncome ? 'income' : 'expense',
        amount: Math.abs(tx.amount),
        description: tx.description || undefined,
        date: tx.date,
        categoryId: tx.categoryId || undefined,
      })
      imported++
    }

    await createBankImport(db, {
      filename: data.filename,
      rowCount: imported,
      status: imported === data.transactions.length ? 'completed' : 'partial',
    })

    return { imported, total: data.transactions.length }
  })

// --- Route ---

export const Route = createFileRoute('/import')({
  component: ImportPage,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

// --- Step indicator ---

type Step = 'upload' | 'mapping' | 'preview'

const STEPS: { key: Step; label: string; icon: typeof Upload }[] = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'mapping', label: 'Map Columns', icon: Columns },
  { key: 'preview', label: 'Preview', icon: Eye },
]

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const isComplete = i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={step.key} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  'h-px w-8',
                  i <= currentIndex ? 'bg-primary' : 'bg-muted-foreground/25',
                )}
              />
            )}
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                isCurrent && 'bg-primary text-primary-foreground',
                isComplete && 'bg-primary/10 text-primary',
                !isCurrent && !isComplete && 'bg-muted text-muted-foreground',
              )}
            >
              {isComplete ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {step.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Page Component ---

function ImportPage() {
  const [step, setStep] = useState<Step>('upload')
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Data flowing through steps
  const [filename, setFilename] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [detectedMapping, setDetectedMapping] = useState<Record<string, string>>({})
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [duplicates, setDuplicates] = useState<Array<{ date: string; amount: number }>>([])
  const [categorySuggestions, setCategorySuggestions] = useState<
    Array<{ description: string; categoryId: number; categoryName: string }>
  >([])
  const [importResult, setImportResult] = useState<{ imported: number; total: number } | null>(null)

  // Step 1: File uploaded
  const handleFileLoaded = useCallback(async (content: string, name: string) => {
    setIsLoading(true)
    setFilename(name)
    setFileContent(content)

    try {
      // Parse without mapping to get headers and raw rows
      const result = await parseFile({ data: { content } })
      setParseResult(result)

      // Auto-detect columns
      const mapping = detectColumns(result.headers)
      setDetectedMapping(mapping)

      setStep('mapping')
    } catch (error) {
      console.error('Failed to parse file:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Step 2: Columns mapped
  async function handleMappingConfirm(mapping: Record<string, string>) {
    setIsLoading(true)

    try {
      // Re-parse with the confirmed mapping
      const result = await parseFile({
        data: { content: fileContent, mapping },
      })
      setParsedRows(result.rows)

      // Check for duplicates and suggest categories in parallel
      const [dupes, suggestions] = await Promise.all([
        checkDuplicates({
          data: {
            rows: result.rows.map((r) => ({ date: r.date, amount: r.amount })),
          },
        }),
        suggestCategories({
          data: {
            descriptions: result.rows
              .map((r) => r.description)
              .filter((d) => d.length > 0),
          },
        }),
      ])

      setDuplicates(dupes)
      setCategorySuggestions(suggestions)
      setStep('preview')
    } catch (error) {
      console.error('Failed to process mapping:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Import selected
  async function handleImport(selectedIndices: number[]) {
    setIsImporting(true)

    try {
      const selectedRows = selectedIndices.map((i) => parsedRows[i])

      // Build suggestion map for auto-categorization
      const suggestionMap = new Map<string, number>()
      for (const s of categorySuggestions) {
        suggestionMap.set(s.description.toLowerCase(), s.categoryId)
      }

      const transactions = selectedRows.map((row) => ({
        date: row.date,
        description: row.description,
        amount: row.amount,
        categoryId: suggestionMap.get(row.description.toLowerCase()),
      }))

      const result = await importTransactions({
        data: { transactions, filename },
      })

      setImportResult(result)
    } catch (error) {
      console.error('Failed to import:', error)
    } finally {
      setIsImporting(false)
    }
  }

  // Reset to start over
  function handleReset() {
    setStep('upload')
    setFilename('')
    setFileContent('')
    setParseResult(null)
    setDetectedMapping({})
    setParsedRows([])
    setDuplicates([])
    setCategorySuggestions([])
    setImportResult(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import</h1>
          <p className="text-sm text-muted-foreground">
            Import transactions from a bank statement CSV file.
          </p>
        </div>
      </div>

      {/* Success state */}
      {importResult ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold">Import Complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Successfully imported {importResult.imported} of {importResult.total} transactions
            from {filename}.
          </p>
          <button
            onClick={handleReset}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Import another file
          </button>
        </div>
      ) : (
        <>
          {/* Step indicator */}
          <StepIndicator current={step} />

          {/* Step content */}
          {step === 'upload' && (
            <FileUpload onFileLoaded={handleFileLoaded} isLoading={isLoading} />
          )}

          {step === 'mapping' && parseResult && (
            <ColumnMapper
              headers={parseResult.headers}
              sampleRows={parseResult.rawRows}
              detectedMapping={detectedMapping}
              onConfirm={handleMappingConfirm}
              onBack={() => setStep('upload')}
            />
          )}

          {step === 'preview' && (
            <PreviewTable
              rows={parsedRows}
              duplicates={duplicates}
              categorySuggestions={categorySuggestions}
              onImport={handleImport}
              onBack={() => setStep('mapping')}
              isImporting={isImporting}
            />
          )}
        </>
      )}
    </div>
  )
}

import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDB } from '~/server/db'
import { getTransactions, getCategories, getCategorizedDescriptions } from '@tracker/db'
import type { ParsedRow, ParseResult } from '~/server/parsers/csv'
import { FileUpload } from '~/components/import/file-upload'
import { ColumnMapper } from '~/components/import/column-mapper'
import { PreviewTable } from '~/components/import/preview-table'
import { Check, Upload, Columns, Eye } from 'lucide-react'
import { cn } from '~/lib/utils'
import { RouteError } from '~/components/route-error'
import { processImport, MAX_IMPORT_ROWS } from '~/server/import-helpers'
import { useTranslation } from '~/i18n'
import { toast } from 'sonner'
import { translateApiError } from '~/i18n/errors'
import { withServerFn } from '~/server/logger'
import { AppError } from '@tracker/shared'

// --- Server Functions ---

// Server-side cap (defense in depth — the client already enforces 10MB).
const MAX_FILE_BYTES = 10 * 1024 * 1024

const parseFileSchema = z.object({
  content: z.string().max(MAX_FILE_BYTES, `File exceeds ${MAX_FILE_BYTES} bytes`),
  mapping: z.record(z.string(), z.string()).optional(),
})

const parseFile = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => parseFileSchema.parse(d))
  .handler(withServerFn('server-fn:parseFile', async ({ data }) => {
    try {
      const { parseCSV } = await import('~/server/parsers/csv')
      return parseCSV(data.content, data.mapping)
    } catch (e) {
      if (e instanceof AppError) throw e
      throw new AppError(
        'IMPORT_FAILED',
        e instanceof Error ? `CSV parse failed: ${e.message}` : 'Failed to parse CSV',
      )
    }
  }))

const detectColumnsSchema = z.object({
  headers: z.array(z.string()).max(200),
})

const detectFileColumns = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => detectColumnsSchema.parse(d))
  .handler(withServerFn('server-fn:detectFileColumns', async ({ data }) => {
    const { detectColumns } = await import('~/server/parsers/csv')
    return detectColumns(data.headers)
  }))

const checkDuplicatesSchema = z.object({
  rows: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        amount: z.number().int(),
      }),
    )
    .max(MAX_IMPORT_ROWS),
})

const checkDuplicates = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => checkDuplicatesSchema.parse(d))
  .handler(withServerFn('server-fn:checkDuplicates', async ({ data }) => {
    const db = getDB()

    // Only query months relevant to the import data
    const months = [...new Set(data.rows.map((r) => r.date.substring(0, 7)))]
    const results = await Promise.all(
      months.map((month) => getTransactions(db, { month })),
    )

    // Build a lookup set from existing transactions
    const existing = new Set<string>()
    for (const row of results.flat()) {
      const tx = row.transactions
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
  }))

const suggestCategoriesSchema = z.object({
  descriptions: z.array(z.string()).max(MAX_IMPORT_ROWS),
})

// Minimum length for a description to be considered for partial matching.
// Shorter strings match too much (e.g. "a" substrings into half the corpus)
// and produce nonsense suggestions.
const MIN_PARTIAL_MATCH_LEN = 4

const suggestCategories = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => suggestCategoriesSchema.parse(d))
  .handler(withServerFn('server-fn:suggestCategories', async ({ data }) => {
    const db = getDB()
    const [descRows, categories] = await Promise.all([
      getCategorizedDescriptions(db),
      getCategories(db),
    ])

    // Build map of description (lowercase) -> most common categoryId
    const descCategoryCount = new Map<string, Map<number, number>>()
    for (const row of (descRows.results ?? []) as Array<{ description: string; category_id: number; cnt: number }>) {
      const desc = row.description.toLowerCase()
      if (!descCategoryCount.has(desc)) {
        descCategoryCount.set(desc, new Map())
      }
      descCategoryCount.get(desc)!.set(row.category_id, row.cnt)
    }

    // Build category lookup
    const categoryMap = new Map<number, string>()
    for (const c of categories) {
      categoryMap.set(c.id, c.name)
    }

    // Pick the (categoryId, totalMatchCount) with the highest count from
    // a counts-by-category map. Returns null if empty.
    function bestCategory(counts: Map<number, number>): { id: number; count: number } | null {
      let bestId = 0
      let bestCount = 0
      for (const [catId, count] of counts) {
        if (count > bestCount) {
          bestCount = count
          bestId = catId
        }
      }
      return bestId && categoryMap.has(bestId) ? { id: bestId, count: bestCount } : null
    }

    const suggestions: Array<{
      description: string
      categoryId: number
      categoryName: string
    }> = []

    const uniqueDescs = [...new Set(data.descriptions.map((d) => d.toLowerCase().trim()))]
    for (const desc of uniqueDescs) {
      if (!desc) continue

      // Exact match wins.
      const exact = descCategoryCount.get(desc)
      if (exact) {
        const best = bestCategory(exact)
        if (best) {
          suggestions.push({
            description: desc,
            categoryId: best.id,
            categoryName: categoryMap.get(best.id)!,
          })
          continue
        }
      }

      // Partial match: aggregate ALL matching existing descriptions and
      // pick the category with the highest total count across them.
      // Skip descriptions shorter than MIN_PARTIAL_MATCH_LEN to avoid the
      // "single character substrings everything" failure mode.
      if (desc.length < MIN_PARTIAL_MATCH_LEN) continue

      const aggregated = new Map<number, number>()
      for (const [existingDesc, counts] of descCategoryCount) {
        if (existingDesc.length < MIN_PARTIAL_MATCH_LEN) continue
        if (existingDesc.includes(desc) || desc.includes(existingDesc)) {
          for (const [catId, count] of counts) {
            aggregated.set(catId, (aggregated.get(catId) ?? 0) + count)
          }
        }
      }
      const best = bestCategory(aggregated)
      if (best) {
        suggestions.push({
          description: desc,
          categoryId: best.id,
          categoryName: categoryMap.get(best.id)!,
        })
      }
    }

    return suggestions
  }))

const importTransactionsSchema = z.object({
  transactions: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().max(500).optional(),
        amount: z.number().int(),
        categoryId: z.number().int().positive().optional(),
      }),
    )
    .max(MAX_IMPORT_ROWS),
  filename: z.string().min(1).max(255),
})

const importTransactions = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => importTransactionsSchema.parse(d))
  .handler(withServerFn('server-fn:importTransactions', async ({ data }) => {
    try {
      return await processImport(data)
    } catch (e) {
      if (e instanceof AppError) throw e
      throw new AppError(
        'IMPORT_FAILED',
        e instanceof Error ? `Import failed: ${e.message}` : 'Failed to import transactions',
      )
    }
  }))

// --- Route ---

export const Route = createFileRoute('/import')({
  component: ImportPage,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

// --- Step indicator ---

type Step = 'upload' | 'mapping' | 'preview'

const STEPS: { key: Step; labelKey: string; icon: typeof Upload }[] = [
  { key: 'upload', labelKey: 'import.step.upload', icon: Upload },
  { key: 'mapping', labelKey: 'import.step.mapping', icon: Columns },
  { key: 'preview', labelKey: 'import.step.preview', icon: Eye },
]

function StepIndicator({ current }: { current: Step }) {
  const { t } = useTranslation()
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
              {t(step.labelKey)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Page Component ---

function ImportPage() {
  const { t } = useTranslation()
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

      // Auto-detect columns via server function
      const mapping = await detectFileColumns({ data: { headers: result.headers } })
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
      toast.success(t('toast.imported'))
    } catch (error) {
      console.error('Failed to import:', error)
      toast.error(translateApiError(error, t))
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
          <h1 className="text-2xl font-bold">{t('import.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('import.subtitle')}
          </p>
        </div>
      </div>

      {/* Success state */}
      {importResult ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold">{t('import.complete.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('import.result', {
              imported: importResult.imported,
              total: importResult.total,
              filename,
            })}
          </p>
          <button
            onClick={handleReset}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            {t('import.complete.again')}
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

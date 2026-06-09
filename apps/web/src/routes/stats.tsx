import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getDB } from '~/server/db'
import { getMonthlySummary, getCategoryBreakdown } from '@tracker/db'
import { z } from 'zod'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  MonthlyTrendChart,
  type MonthlySummaryRow,
} from '~/components/stats/monthly-trend-chart'
import {
  CategoryBreakdownChart,
  type CategoryBreakdownRow,
} from '~/components/stats/category-breakdown-chart'
import { Skeleton } from '~/components/ui/skeleton'
import { RouteError } from '~/components/route-error'
import { useTranslation } from '~/i18n'
import { withServerFn } from '~/server/logger'

// --- Server Functions ---

const getMonthlyStats = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ year: z.string().regex(/^\d{4}$/) }))
  .handler(withServerFn('server-fn:getMonthlyStats', async ({ data }) => {
    const db = getDB()
    const result = await getMonthlySummary(db, data.year)
    return (result.results ?? []) as unknown as MonthlySummaryRow[]
  }))

const getCategoryStats = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
  .handler(withServerFn('server-fn:getCategoryStats', async ({ data }) => {
    const db = getDB()
    const result = await getCategoryBreakdown(db, data.month)
    return (result.results ?? []) as unknown as CategoryBreakdownRow[]
  }))

// --- Helpers ---

function getCurrentYear(): number {
  return new Date().getFullYear()
}

function getCurrentMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

const MONTH_VALUES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

// --- Route ---

export const Route = createFileRoute('/stats')({
  loader: async () => {
    const year = String(getCurrentYear())
    const month = getCurrentMonth()

    const [monthlyData, categoryData] = await Promise.all([
      getMonthlyStats({ data: { year } }),
      getCategoryStats({ data: { month } }),
    ])

    return { monthlyData, categoryData, year, month }
  },
  component: StatsPage,
  pendingComponent: StatsSkeleton,
  errorComponent: ({ error }) => <RouteError error={error} />,
})

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  )
}

// --- Page Component ---

function StatsPage() {
  const { t } = useTranslation()
  const loaderData = Route.useLoaderData()

  const [year, setYear] = useState(Number(loaderData.year))
  const [selectedMonth, setSelectedMonth] = useState(loaderData.month)
  const [monthlyData, setMonthlyData] = useState<MonthlySummaryRow[]>(
    loaderData.monthlyData,
  )
  const [categoryData, setCategoryData] = useState<CategoryBreakdownRow[]>(
    loaderData.categoryData,
  )
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false)
  const [isLoadingCategory, setIsLoadingCategory] = useState(false)

  async function changeYear(newYear: number) {
    setYear(newYear)
    setIsLoadingMonthly(true)
    try {
      const data = await getMonthlyStats({ data: { year: String(newYear) } })
      setMonthlyData(data)
    } catch (error) {
      console.error('Failed to fetch monthly stats:', error)
    } finally {
      setIsLoadingMonthly(false)
    }
  }

  async function changeMonth(newMonth: string) {
    setSelectedMonth(newMonth)
    setIsLoadingCategory(true)
    try {
      const data = await getCategoryStats({ data: { month: newMonth } })
      setCategoryData(data)
    } catch (error) {
      console.error('Failed to fetch category stats:', error)
    } finally {
      setIsLoadingCategory(false)
    }
  }

  // Derive month parts for the select
  const [monthYear, monthNum] = selectedMonth.split('-')

  function handleMonthSelect(mm: string) {
    changeMonth(`${monthYear}-${mm}`)
  }

  function handleMonthYearChange(delta: number) {
    const newYear = Number(monthYear) + delta
    changeMonth(`${newYear}-${monthNum}`)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('stats.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('stats.subtitle')}
        </p>
      </div>

      {/* Monthly Trends Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('stats.monthlyTrends')}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => changeYear(year - 1)}
                disabled={isLoadingMonthly}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-12 text-center tabular-nums">
                {year}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => changeYear(year + 1)}
                disabled={isLoadingMonthly}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingMonthly ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : (
            <MonthlyTrendChart data={monthlyData} />
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('stats.categoryBreakdown')}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleMonthYearChange(-1)}
                disabled={isLoadingCategory}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={monthNum} onValueChange={handleMonthSelect}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_VALUES.map((mm) => (
                    <SelectItem key={mm} value={mm}>
                      {t(`common.month.full.${mm}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm font-medium tabular-nums">{monthYear}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleMonthYearChange(1)}
                disabled={isLoadingCategory}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingCategory ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : (
            <CategoryBreakdownChart data={categoryData} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import type { InvestmentSnapshot } from '@tracker/shared'
import { Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { formatCents } from '~/lib/utils'

interface SnapshotHistoryProps {
  snapshots: InvestmentSnapshot[]
  onDelete: (snapshot: InvestmentSnapshot) => void
}

export function SnapshotHistory({ snapshots, onDelete }: SnapshotHistoryProps) {
  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No snapshots yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add your first investment snapshot to start tracking your portfolio.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {snapshots.map((snapshot) => (
        <div
          key={snapshot.id}
          className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground font-mono">
              {formatDisplayDate(snapshot.date)}
            </div>
            <div className="font-semibold tabular-nums">
              {formatCents(snapshot.totalValue)}
            </div>
            {snapshot.note && (
              <div className="text-sm text-muted-foreground">
                {snapshot.note}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(snapshot)}
            aria-label={`Delete snapshot from ${snapshot.date}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  )
}

function formatDisplayDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${year}-${month}-${day}`
}

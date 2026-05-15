import { Skeleton } from '~/components/ui/skeleton'

export function TransactionFormSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  )
}

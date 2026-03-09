import { Button } from '~/components/ui/button'

export function RouteError({ error }: { error: Error }) {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-destructive">
          Something went wrong
        </h2>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    </div>
  )
}

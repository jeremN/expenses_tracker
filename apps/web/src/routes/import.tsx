import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/import')({
  component: () => <div className="text-2xl font-bold">Import</div>,
})

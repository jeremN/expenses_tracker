import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/recurring')({
  component: () => <div className="text-2xl font-bold">Recurring</div>,
})

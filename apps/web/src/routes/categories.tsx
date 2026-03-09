import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/categories')({
  component: () => <div className="text-2xl font-bold">Categories</div>,
})

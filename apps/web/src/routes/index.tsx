import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div>
      <h1>Expenses Tracker v2</h1>
      <p>Coming soon.</p>
    </div>
  )
}

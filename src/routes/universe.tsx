import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Universe } from '../universe/Universe'

export const Route = createFileRoute('/universe')({
  component: UniversePage,
})

function UniversePage() {
  // WebGL is client-only; TanStack Start renders this route on the server too.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="universe-root" />
  }
  return <Universe />
}

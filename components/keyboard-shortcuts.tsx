'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function KeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.metaKey || e.ctrlKey) return

      switch (e.key) {
        case '/':
          e.preventDefault()
          router.push('/ai-search')
          break
        case 'n':
          router.push('/new')
          break
        case 'b':
          router.push('/bookmarks')
          break
        case 'r':
          router.push('/reading')
          break
        case 'i':
          router.push('/insights')
          break
        case 'h':
          router.push('/')
          break
      }
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [router])

  return null
}

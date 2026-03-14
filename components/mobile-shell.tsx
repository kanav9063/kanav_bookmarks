'use client'

import { useState, useCallback, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

export function MobileShell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [unseenCount, setUnseenCount] = useState(0)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Fetch unseen count
  useEffect(() => {
    fetch('/api/unseen')
      .then(r => r.json())
      .then(d => { if (d.total !== undefined) setUnseenCount(d.total) })
      .catch(() => {})
  }, [pathname])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 bg-zinc-900/95 backdrop-blur-md border border-zinc-800/60 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors shadow-lg"
        aria-label="Open menu"
      >
        <Menu size={20} />
            {unseenCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full min-w-[18px] leading-none px-1">
                {unseenCount > 99 ? '99+' : unseenCount}
              </span>
            )}
      </button>

      {/* Desktop: sidebar always visible */}
      <div className="hidden lg:block shrink-0">
        {nav}
      </div>

      {/* Mobile: sidebar as slide-over */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-[55] flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          {/* Sidebar */}
          <div className="relative z-10 w-[260px] max-w-[80vw] animate-slide-in">
            {nav}
          </div>
          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-3 right-3 z-10 p-2 text-zinc-400 hover:text-zinc-100"
          >
            <X size={22} />
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </>
  )
}

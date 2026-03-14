'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-zinc-900/90 backdrop-blur border border-zinc-800/50 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
      aria-label="Menu"
    >
      <Menu size={20} />
    </button>
  )
}

export function MobileOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Close button */}
      <button
        onClick={onClose}
        className="lg:hidden fixed top-3 right-3 z-[60] p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
        aria-label="Close menu"
      >
        <X size={20} />
      </button>
    </>
  )
}

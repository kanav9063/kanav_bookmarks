'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  Search,
  Tag,
  GitBranch,
  Settings,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/bookmarks', label: 'Browse', icon: Search },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/mindmap', label: 'Mindmap', icon: GitBranch },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export default function Nav() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-zinc-900 border-r border-zinc-800 shrink-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-800">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm select-none">
          X
        </div>
        <span className="text-zinc-100 font-semibold text-lg tracking-tight">
          bookmark<span className="text-indigo-400">X</span>
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-transparent'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

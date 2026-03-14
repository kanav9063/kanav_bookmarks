import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/nav'
import CommandPalette from '@/components/command-palette'
import { MobileShell } from '@/components/mobile-shell'
import { ToastProvider } from '@/components/toast'
import KeyboardShortcuts from '@/components/keyboard-shortcuts'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: "Kanav's Reads",
  description: "Personal knowledge base — bookmarks, articles, videos, and insights.",
  metadataBase: new URL('https://kanav-bookmarks.vercel.app'),
  openGraph: {
    title: "Kanav's Reads",
    description: "Personal knowledge base — bookmarks, articles, videos, and insights.",
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: "Kanav's Reads",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})()` }} />
      </head>
      <body className="flex min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <ToastProvider>
        <MobileShell nav={<Nav />}>
          {children}
        </MobileShell>
        <CommandPalette />
        <KeyboardShortcuts />
        </ToastProvider>
      </body>
    </html>
  )
}

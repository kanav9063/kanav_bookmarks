'use client'

import { useState } from 'react'
import { Eye, EyeOff, Download, Check, AlertCircle } from 'lucide-react'

interface Toast {
  type: 'success' | 'error'
  message: string
}

function ToastAlert({ toast }: { toast: Toast }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
      toast.type === 'success'
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-red-500/10 text-red-400 border border-red-500/20'
    }`}>
      {toast.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
      {toast.message}
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      <p className="text-sm text-zinc-400 mt-0.5">{description}</p>
    </div>
  )
}

function ApiKeySection({ onToast }: { onToast: (t: Toast) => void }) {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!key.trim()) {
      onToast({ type: 'error', message: 'Please enter an API key' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claudeApiKey: key.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      onToast({ type: 'success', message: 'API key saved successfully' })
      setKey('')
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save API key' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <SectionHeader
        title="Claude API Key"
        description="Required for AI categorization. Get your key at console.anthropic.com"
      />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors pr-10"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors shrink-0"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Your key is stored locally and never sent to any third party.
      </p>
    </div>
  )
}

function ExportButton({ label, href }: { label: string; href: string }) {
  return (
    <button
      onClick={() => { window.location.href = href }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors border border-zinc-700"
    >
      <Download size={15} />
      {label}
    </button>
  )
}

function DataSection() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <SectionHeader
        title="Data Management"
        description="Export all your bookmarks in your preferred format."
      />
      <div className="flex flex-wrap gap-3">
        <ExportButton label="Export All (CSV)" href="/api/export?type=csv" />
        <ExportButton label="Export All (JSON)" href="/api/export?type=json" />
      </div>
    </div>
  )
}

function AboutSection() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <SectionHeader
        title="About bookmarkX"
        description=""
      />
      <p className="text-sm text-zinc-400 leading-relaxed">
        <strong className="text-zinc-100">bookmarkX</strong> is a self-hosted app for organizing your
        Twitter/X bookmarks. Import bookmarks via the twitter-web-exporter extension, use Claude AI to
        automatically categorize them, and explore connections through the interactive mindmap.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
        <span>Next.js 15</span>
        <span>·</span>
        <span>Prisma + SQLite</span>
        <span>·</span>
        <span>Claude AI</span>
        <span>·</span>
        <span>React Flow</span>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [toast, setToast] = useState<Toast | null>(null)

  function showToast(t: Toast) {
    setToast(t)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-400 mt-1">Configure your bookmarkX instance</p>
      </div>

      {toast && (
        <div className="mb-5">
          <ToastAlert toast={toast} />
        </div>
      )}

      <div className="space-y-4">
        <ApiKeySection onToast={showToast} />
        <DataSection />
        <AboutSection />
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Upload, CheckCircle, ChevronRight, Loader2 } from 'lucide-react'
import * as Progress from '@radix-ui/react-progress'

type Step = 1 | 2 | 3

interface ImportResult {
  imported: number
  skipped: number
  total: number
}

interface CategorizeStatus {
  done: number
  total: number
  status: string
}

function StepIndicator({ current }: { current: Step }) {
  const steps = ['Upload', 'Importing', 'Categorize']
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const num = (i + 1) as Step
        const isActive = num === current
        const isDone = num < current
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
              isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {isDone ? <CheckCircle size={14} /> : num}
            </div>
            <span className={`text-sm ${isActive ? 'text-zinc-100' : 'text-zinc-500'}`}>{label}</span>
            {i < steps.length - 1 && <ChevronRight size={14} className="text-zinc-700 ml-1" />}
          </div>
        )
      })}
    </div>
  )
}

function InstructionsStep({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.json')) onFile(file)
  }, [onFile])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }, [onFile])

  const steps = [
    'Install the "twitter-web-exporter" browser extension (Chrome/Firefox)',
    'Navigate to twitter.com/bookmarks while logged in',
    'Click the extension icon and select "Export as JSON"',
    'Upload the downloaded JSON file below',
  ]

  return (
    <div>
      <ol className="space-y-3 mb-8">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          dragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900'
        }`}
      >
        <Upload size={32} className="mx-auto mb-3 text-zinc-500" />
        <p className="text-zinc-300 font-medium">Drop your JSON file here</p>
        <p className="text-zinc-500 text-sm mt-1">or click to browse</p>
        <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
      </div>
    </div>
  )
}

function ImportingStep({ result, onCategorize }: {
  result: ImportResult | null
  onCategorize: () => void
}) {
  if (!result) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <Loader2 size={40} className="text-indigo-400 animate-spin" />
        <p className="text-zinc-300 text-lg font-medium">Importing bookmarks...</p>
        <p className="text-zinc-500 text-sm">This may take a moment</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
        <CheckCircle size={32} className="text-emerald-400" />
      </div>
      <div className="text-center">
        <p className="text-xl font-bold text-zinc-100">Import Complete</p>
        <p className="text-zinc-400 mt-1">
          <span className="text-emerald-400 font-semibold">{result.imported}</span> imported,{' '}
          <span className="text-zinc-500">{result.skipped} skipped</span> as duplicates
        </p>
      </div>
      <button
        onClick={onCategorize}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
      >
        Categorize with AI
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

function CategorizeStep() {
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState<CategorizeStatus | null>(null)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function startCategorization() {
    if (!apiKey.trim()) {
      setError('Please enter your Claude API key')
      return
    }
    setError('')
    setRunning(true)

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claudeApiKey: apiKey }),
      })

      fetch('/api/categorize', { method: 'POST' }).catch(console.error)
      pollStatus()
    } catch (err) {
      setError(`Failed to start categorization: ${err instanceof Error ? err.message : String(err)}`)
      setRunning(false)
    }
  }

  function pollStatus() {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/categorize')
        const data = await res.json()
        setStatus(data)
        if (data.status === 'idle' || data.done >= data.total) {
          clearInterval(interval)
          setDone(true)
          setRunning(false)
        }
      } catch {
        clearInterval(interval)
        setRunning(false)
      }
    }, 2000)
  }

  const progress = status ? Math.round((status.done / Math.max(status.total, 1)) * 100) : 0

  return (
    <div className="space-y-6">
      {!running && !done && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Claude API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Get your key at{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                console.anthropic.com
              </a>
            </p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={startCategorization}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Start Categorization
          </button>
        </div>
      )}

      {running && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="text-indigo-400 animate-spin shrink-0" />
            <p className="text-zinc-300 font-medium">
              {status ? `${status.done} / ${status.total} categorized` : 'Starting...'}
            </p>
          </div>
          <Progress.Root className="relative h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <Progress.Indicator
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </Progress.Root>
        </div>
      )}

      {done && (
        <div className="flex flex-col items-center gap-5 py-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-zinc-100">Categorization Complete!</p>
          <Link
            href="/bookmarks"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            View your bookmarks
            <ChevronRight size={16} />
          </Link>
        </div>
      )}
    </div>
  )
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>(1)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)

  async function handleFile(file: File) {
    setStep(2)
    setImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Import failed')

      setImportResult({
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
        total: (data.imported ?? 0) + (data.skipped ?? 0),
      })
    } catch (err) {
      console.error('Import error:', err)
      setImportResult({ imported: 0, skipped: 0, total: 0 })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Import Bookmarks</h1>
        <p className="text-zinc-400 mt-1">Import your Twitter bookmarks from a JSON export.</p>
      </div>

      <StepIndicator current={step} />

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        {step === 1 && <InstructionsStep onFile={handleFile} />}
        {step === 2 && (
          <ImportingStep
            result={importing ? null : importResult}
            onCategorize={() => setStep(3)}
          />
        )}
        {step === 3 && <CategorizeStep />}
      </div>
    </div>
  )
}

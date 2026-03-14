'use client'

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react'
import { Check, X, AlertCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

const ToastContext = createContext<{
  toast: (message: string, type?: Toast['type']) => void
}>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const icons = {
    success: <Check size={14} className="text-emerald-400" />,
    error: <AlertCircle size={14} className="text-red-400" />,
    info: <Info size={14} className="text-blue-400" />,
  }

  const borders = {
    success: 'border-emerald-500/20',
    error: 'border-red-500/20',
    info: 'border-blue-500/20',
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 bg-zinc-900/95 backdrop-blur-md border ${borders[t.type]} rounded-xl shadow-lg shadow-black/30 animate-slide-up min-w-[200px]`}
          >
            {icons[t.type]}
            <span className="text-[13px] text-zinc-200">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="ml-auto text-zinc-600 hover:text-zinc-300 shrink-0">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { BarChart3, BookOpen, Video, FileText, Lightbulb, Clock, TrendingUp } from 'lucide-react'

interface Stats {
  totalItems: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  totalInsights: number
  insightsBySource: Record<string, number>
  totalBookmarks: number
  totalCategories: number
  recentActivity: { date: string; count: number }[]
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/reading').then(r => r.json()),
      fetch('/api/insights?recent=100').then(r => r.json()),
      fetch('/api/stats').then(r => r.json()),
    ]).then(([reading, insights, bookmarks]) => {
      const items = reading.items || []
      const byType: Record<string, number> = {}
      const byStatus: Record<string, number> = {}
      items.forEach((item: any) => {
        byType[item.type] = (byType[item.type] || 0) + 1
        byStatus[item.status] = (byStatus[item.status] || 0) + 1
      })

      const allInsights = insights.insights || []
      const insightsBySource: Record<string, number> = {}
      allInsights.forEach((i: any) => {
        insightsBySource[i.source] = (insightsBySource[i.source] || 0) + 1
      })

      // Activity by date (last 7 days)
      const activity: Record<string, number> = {}
      items.forEach((item: any) => {
        const date = new Date(item.addedAt).toLocaleDateString('en-US', { weekday: 'short' })
        activity[date] = (activity[date] || 0) + 1
      })

      setStats({
        totalItems: items.length,
        byType,
        byStatus,
        totalInsights: allInsights.length,
        insightsBySource,
        totalBookmarks: bookmarks.totalBookmarks || 0,
        totalCategories: bookmarks.totalCategories || 0,
        recentActivity: Object.entries(activity).map(([date, count]) => ({ date, count })),
      })
    })
  }, [])

  if (!stats) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600">Loading...</div>

  const typeIcons: Record<string, any> = {
    article: FileText,
    video: Video,
    book: BookOpen,
  }

  const statCards = [
    { label: 'X Bookmarks', value: stats.totalBookmarks, icon: BarChart3, color: 'text-blue-400', bg: 'from-blue-500/20 to-blue-600/10' },
    { label: 'Reading Items', value: stats.totalItems, icon: BookOpen, color: 'text-violet-400', bg: 'from-violet-500/20 to-violet-600/10' },
    { label: 'Insights', value: stats.totalInsights, icon: Lightbulb, color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-600/10' },
    { label: 'Categories', value: stats.totalCategories, icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-600/10' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pt-14 lg:pt-8">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 mb-8">
          <div className="p-2 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-xl">
            <BarChart3 size={20} className="text-violet-400" />
          </div>
          Knowledge Stats
        </h1>

        {/* Main stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {statCards.map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.bg} border border-zinc-800/30 rounded-xl p-4 text-center card-hover`}>
              <s.icon size={20} className={`${s.color} mx-auto mb-2`} />
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-zinc-500 mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Breakdown sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* By Type */}
          <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-5">
            <h3 className="text-[14px] font-semibold text-zinc-300 mb-4">Content Types</h3>
            <div className="space-y-3">
              {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const Icon = typeIcons[type] || FileText
                const pct = Math.round((count / stats.totalItems) * 100)
                return (
                  <div key={type} className="flex items-center gap-3">
                    <Icon size={14} className="text-zinc-500 shrink-0" />
                    <span className="text-[13px] text-zinc-300 capitalize flex-1">{type}s</span>
                    <span className="text-[13px] text-zinc-500 font-mono">{count}</span>
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500/50 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* By Status */}
          <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-5">
            <h3 className="text-[14px] font-semibold text-zinc-300 mb-4">Reading Status</h3>
            <div className="space-y-3">
              {Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                const colors: Record<string, string> = { 'want-to-read': 'bg-blue-500/50', reading: 'bg-amber-500/50', finished: 'bg-emerald-500/50' }
                const labels: Record<string, string> = { 'want-to-read': 'Want to Read', reading: 'Reading', finished: 'Finished' }
                const pct = Math.round((count / stats.totalItems) * 100)
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-[13px] text-zinc-300 flex-1">{labels[status] || status}</span>
                    <span className="text-[13px] text-zinc-500 font-mono">{count}</span>
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[status] || 'bg-zinc-500/50'} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Insight Sources */}
          <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-5">
            <h3 className="text-[14px] font-semibold text-zinc-300 mb-4">Insight Sources</h3>
            <div className="space-y-3">
              {Object.entries(stats.insightsBySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => {
                const emojis: Record<string, string> = { ai: '🤖', discussion: '💬', manual: '✍️' }
                const pct = Math.round((count / stats.totalInsights) * 100)
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className="text-sm">{emojis[source] || '💡'}</span>
                    <span className="text-[13px] text-zinc-300 capitalize flex-1">{source}</span>
                    <span className="text-[13px] text-zinc-500 font-mono">{count}</span>
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

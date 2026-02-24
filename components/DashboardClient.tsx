'use client'

import { useState } from 'react'
import StatsBar from '@/components/StatsBar'
import OpportunityCard from '@/components/OpportunityCard'
import ReplyModal, { type ReplyVariation } from '@/components/ReplyModal'

export interface SerializedOpportunity {
  id: string
  platform: string
  url: string
  title: string
  body: string | null
  subreddit: string | null
  author: string
  commentCount: number
  score: number
  postedAt: string
  relevanceScore: number
  intentLevel: string
  reasoning: string
  suggestedReplies: ReplyVariation[]
  replied: boolean
  createdAt: string
}

export type DashboardBanner =
  | { type: 'upgraded' }
  | { type: 'trial'; daysRemaining: number }
  | { type: 'expired' }
  | null

type Filter = 'all' | 'high' | 'medium' | 'low'

interface Props {
  opportunities: SerializedOpportunity[]
  stats: { opportunitiesFound: number; repliesMade: number; skipped: number }
  banner: DashboardBanner
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: '🔥🔥🔥 High', value: 'high' },
  { label: '🔥🔥 Medium', value: 'medium' },
  { label: '🔥 Low', value: 'low' },
]

export default function DashboardClient({ opportunities, stats, banner }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [repliedIds, setRepliedIds] = useState<Set<string>>(new Set())
  const [repliedCount, setRepliedCount] = useState(stats.repliesMade)
  const [skippedCount, setSkippedCount] = useState(stats.skipped)
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [selectedOpp, setSelectedOpp] = useState<SerializedOpportunity | null>(null)

  function markReplied(id: string) {
    if (repliedIds.has(id)) return
    setRepliedIds((prev) => new Set([...prev, id]))
    setRepliedCount((prev) => prev + 1)
  }

  const visible = opportunities.filter((opp) => {
    if (dismissedIds.has(opp.id)) return false
    if (activeFilter === 'all') return true
    return opp.intentLevel === activeFilter
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      {banner?.type === 'upgraded' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3 text-center text-sm text-green-800">
          🎉 Welcome to LaunchRadar Pro!
        </div>
      )}
      {banner?.type === 'trial' && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-center text-sm text-yellow-800">
          Free trial — {banner.daysRemaining} day{banner.daysRemaining !== 1 ? 's' : ''} remaining ·{' '}
          <a href="/settings" className="font-semibold underline">
            Upgrade Now
          </a>
        </div>
      )}
      {banner?.type === 'expired' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-center text-sm text-red-800">
          Your trial has ended ·{' '}
          <a href="/settings" className="font-semibold underline">
            Upgrade Now
          </a>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Stats */}
        <StatsBar
          opportunitiesFound={stats.opportunitiesFound}
          repliesMade={repliedCount}
          skipped={skippedCount}
        />

        {/* Filter tabs */}
        <div className="flex gap-2 border-b border-border">
          {FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeFilter === value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Cards */}
        {visible.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-sm">
            No opportunities yet. Your first digest arrives tomorrow morning.
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                externalReplied={repliedIds.has(opp.id)}
                onViewReply={() => setSelectedOpp(opp)}
                onReplied={(id) => markReplied(id)}
                onDismissed={(id) => {
                  setDismissedIds((prev) => new Set([...prev, id]))
                  setSkippedCount((prev) => prev + 1)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {selectedOpp && (
        <ReplyModal
          opportunity={selectedOpp}
          isOpen={true}
          onClose={() => setSelectedOpp(null)}
          onReplied={() => {
            markReplied(selectedOpp.id)
            setSelectedOpp(null)
          }}
        />
      )}
    </div>
  )
}

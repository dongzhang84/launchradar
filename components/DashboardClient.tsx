'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StatsBar from '@/components/StatsBar'
import OpportunityCard from '@/components/OpportunityCard'
import ReplyModal, { type ReplyVariation } from '@/components/ReplyModal'
import BuyModal from '@/components/BuyModal'

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
  scanning?: boolean
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: '🔥🔥🔥 High', value: 'high' },
  { label: '🔥🔥 Medium', value: 'medium' },
  { label: '🔥 Low', value: 'low' },
]

export default function DashboardClient({ opportunities, stats, banner, scanning = false }: Props) {
  const router = useRouter()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [repliedIds, setRepliedIds] = useState<Set<string>>(new Set())
  const [repliedCount, setRepliedCount] = useState(stats.repliesMade)
  const [skippedCount, setSkippedCount] = useState(stats.skipped)
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [selectedOpp, setSelectedOpp] = useState<SerializedOpportunity | null>(null)
  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(scanning)

  // Poll /api/opportunities/count every 8s while scanning banner is shown.
  // Stop when count > 0 or 60s have elapsed, then refresh the page data.
  useEffect(() => {
    if (!isScanning) return

    let elapsed = 0
    const id = setInterval(async () => {
      elapsed += 8
      try {
        const res = await fetch('/api/opportunities/count')
        const { count } = await res.json()
        if (count > 0 || elapsed >= 60) {
          clearInterval(id)
          setIsScanning(false)
          router.replace('/dashboard')
          router.refresh()
        }
      } catch {
        // ignore transient fetch errors during polling
      }
    }, 8000)

    return () => clearInterval(id)
  }, [isScanning, router])

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
      {/* Scanning banner */}
      {isScanning && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 text-center text-sm text-blue-800">
          🔍 Scanning Reddit &amp; HN for opportunities… this takes about 30 seconds.
        </div>
      )}

      {/* Subscription banners (disabled for personal tool) */}
      {banner?.type === 'upgraded' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3 text-center text-sm text-green-800">
          🎉 Welcome to LaunchRadar Pro!
        </div>
      )}
      {banner?.type === 'trial' && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-center text-sm text-yellow-800">
          Free trial — {banner.daysRemaining} day{banner.daysRemaining !== 1 ? 's' : ''} remaining ·{' '}
          <button onClick={() => setBuyModalOpen(true)} className="font-semibold underline">
            Upgrade Now
          </button>
        </div>
      )}
      {banner?.type === 'expired' && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-center text-sm text-red-800">
          Your trial has ended ·{' '}
          <button onClick={() => setBuyModalOpen(true)} className="font-semibold underline">
            Upgrade Now
          </button>
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
            {isScanning
              ? 'Hang tight — your first opportunities are loading…'
              : 'No opportunities yet. Your first digest arrives tomorrow morning.'}
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

      <BuyModal isOpen={buyModalOpen} onClose={() => setBuyModalOpen(false)} />
    </div>
  )
}

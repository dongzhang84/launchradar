'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SerializedOpportunity } from '@/components/DashboardClient'

interface Props {
  opportunity: SerializedOpportunity
  externalReplied?: boolean
  onViewReply: () => void
  onReplied: (id: string) => void
  onDismissed: (id: string) => void
}

const INTENT_CONFIG = {
  high:   { emoji: '🔥🔥🔥', label: 'HIGH',   className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  medium: { emoji: '🔥🔥',   label: 'MEDIUM', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  low:    { emoji: '🔥',     label: 'LOW',    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
} as const

const DISMISS_REASONS = [
  'Wrong audience',
  'Too broad',
  'Too many comments',
  'Job posting',
  'Other',
]

function hoursAgo(isoString: string): number {
  return Math.round((Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60))
}

export default function OpportunityCard({ opportunity, externalReplied, onViewReply, onReplied, onDismissed }: Props) {
  const [replied, setReplied] = useState<boolean>(opportunity.replied === true)

  useEffect(() => {
    if (externalReplied) setReplied(true)
  }, [externalReplied])
  const [replying, setReplying] = useState(false)
  const [fading, setFading] = useState(false)
  const [hidden, setHidden] = useState(false)

  const intent =
    INTENT_CONFIG[opportunity.intentLevel as keyof typeof INTENT_CONFIG] ??
    INTENT_CONFIG.low

  const source =
    opportunity.platform === 'reddit' && opportunity.subreddit
      ? `r/${opportunity.subreddit}`
      : 'Hacker News'

  async function handleReply() {
    setReplying(true)
    try {
      await fetch(`/api/opportunities/${opportunity.id}/reply`, { method: 'POST' })
      setReplied(true)
      onReplied(opportunity.id)
    } finally {
      setReplying(false)
    }
  }

  async function handleDismiss(reason: string) {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opportunityId: opportunity.id,
        isRelevant: false,
        reason,
      }),
    })
    setFading(true)
    setTimeout(() => {
      setHidden(true)
      onDismissed(opportunity.id)
    }, 300)
  }

  if (hidden) return null

  return (
    <div
      className="transition-opacity duration-300"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <Card>
        <CardContent className="p-5 space-y-3">
          {/* Intent + source line */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={intent.className} variant="secondary">
              {intent.emoji} {intent.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {source} · {hoursAgo(opportunity.postedAt)}h ago · {opportunity.commentCount} comments
            </span>
          </div>

          {/* Title */}
          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold leading-snug line-clamp-2 hover:underline hover:text-blue-600 transition-colors"
          >
            {opportunity.title}
          </a>

          {/* Reasoning */}
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Why relevant: </span>
            {opportunity.reasoning}
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={onViewReply}>
              View Thread
            </Button>

            {replied ? (
              <Button
                size="sm"
                variant="outline"
                disabled
                className="text-green-600 border-green-300 bg-green-50 hover:bg-green-50 hover:text-green-600 cursor-default"
              >
                Replied ✓
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReply}
                disabled={replying}
                className="text-muted-foreground hover:text-foreground"
              >
                {replying ? 'Saving…' : 'Mark Replied'}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="text-muted-foreground">
                  Skip ✗
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {DISMISS_REASONS.map((reason) => (
                  <DropdownMenuItem
                    key={reason}
                    onClick={() => handleDismiss(reason)}
                  >
                    {reason}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SerializedOpportunity } from '@/components/DashboardClient'

interface ReplyVariation {
  approach: string
  label: string
  text: string
  pros: string
  cons: string
}

interface Props {
  opportunity: SerializedOpportunity | null
  open: boolean
  onClose: () => void
}

const APPROACH_CONFIG: Record<string, { label: string; className: string }> = {
  helpful:     { label: 'Helpful',     className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  educational: { label: 'Educational', className: 'bg-purple-100 text-purple-700 hover:bg-purple-100' },
  question:    { label: 'Question',    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
}

export default function ReplyModal({ opportunity, open, onClose }: Props) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  if (!opportunity) return null

  const replies = (opportunity.suggestedReplies as ReplyVariation[] | null) ?? []

  async function copyText(text: string, index: number) {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="leading-snug pr-4">{opportunity.title}</DialogTitle>
        </DialogHeader>

        <a
          href={opportunity.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground underline break-all"
        >
          View original thread →
        </a>

        {replies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No reply suggestions available for this post.
          </p>
        ) : (
          <div className="space-y-4 pt-2">
            {replies.map((reply, index) => {
              const config =
                APPROACH_CONFIG[reply.approach] ?? APPROACH_CONFIG.question
              return (
                <div key={index} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={config.className}>
                        {config.label}
                      </Badge>
                      <span className="text-sm font-medium">{reply.label}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyText(reply.text, index)}
                      className="text-xs text-muted-foreground shrink-0"
                    >
                      {copiedIndex === index ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>

                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.text}</p>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium text-green-700">+ </span>
                      {reply.pros}
                    </div>
                    <div>
                      <span className="font-medium text-red-600">− </span>
                      {reply.cons}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

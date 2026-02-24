'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface ReplyVariation {
  approach: string
  label: string
  text: string
  pros: string
  cons: string
}

interface Opportunity {
  id: string
  title: string
  body?: string | null
  url: string
  subreddit?: string | null
  platform: string
  suggestedReplies: ReplyVariation[]
}

interface ReplyModalProps {
  opportunity: Opportunity
  isOpen: boolean
  onClose: () => void
  onReplied: () => void
}

const BODY_LINE_LIMIT = 5

export default function ReplyModal({ opportunity, isOpen, onClose, onReplied }: ReplyModalProps) {
  const [bodyExpanded, setBodyExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setBodyExpanded(false)
      setIsSubmitting(false)
    }
  }, [isOpen])

  const bodyLines = (opportunity.body ?? '').split('\n')
  const isTruncatable = bodyLines.length > BODY_LINE_LIMIT
  const visibleBody = bodyExpanded
    ? opportunity.body ?? ''
    : bodyLines.slice(0, BODY_LINE_LIMIT).join('\n')

  async function handleMarkReplied() {
    setIsSubmitting(true)
    try {
      await fetch(`/api/opportunities/${opportunity.id}/reply`, { method: 'POST' })
    } catch {
      // best-effort
    }
    setIsSubmitting(false)
    onClose()
    onReplied()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-base font-semibold leading-snug pr-4">
            {opportunity.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {opportunity.body && (
            <div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {visibleBody}
              </p>
              {isTruncatable && !bodyExpanded && (
                <button
                  onClick={() => setBodyExpanded(true)}
                  className="mt-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Show more
                </button>
              )}
            </div>
          )}
          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Open original thread →
          </a>
        </div>

        <div className="flex justify-end px-6 py-4 border-t shrink-0">
          <Button size="sm" onClick={handleMarkReplied} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Mark as Replied ✓'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

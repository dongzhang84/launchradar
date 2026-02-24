'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

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
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [replyText, setReplyText] = useState('')
  const [bodyExpanded, setBodyExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const replies = opportunity.suggestedReplies ?? []
  const selected = replies[selectedIndex]

  // Sync textarea when selected approach changes
  useEffect(() => {
    if (selected) setReplyText(selected.text)
  }, [selectedIndex, selected])

  // Reset local state each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0)
      setBodyExpanded(false)
      setCopied(false)
      setIsSubmitting(false)
    }
  }, [isOpen])

  const bodyLines = (opportunity.body ?? '').split('\n')
  const isTruncatable = bodyLines.length > BODY_LINE_LIMIT
  const visibleBody = bodyExpanded
    ? opportunity.body ?? ''
    : bodyLines.slice(0, BODY_LINE_LIMIT).join('\n')

  async function handleCopy() {
    await navigator.clipboard.writeText(replyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleMarkReplied() {
    setIsSubmitting(true)
    try {
      await fetch(`/api/opportunities/${opportunity.id}/reply`, { method: 'POST' })
    } catch {
      // best-effort; UI still closes
    }
    setIsSubmitting(false)
    onClose()
    onReplied()
  }

  const platformLabel = opportunity.platform === 'reddit' ? 'Reddit' : 'HN'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-base font-semibold leading-snug pr-4">
            {opportunity.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Section 1 — Post context */}
          <div className="space-y-2">
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

          {/* Section 2 — Choose approach */}
          {replies.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Choose approach</Label>
              <div className="space-y-3">
                {replies.map((reply, i) => (
                  <div key={reply.approach}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="reply-approach"
                        value={reply.approach}
                        checked={selectedIndex === i}
                        onChange={() => setSelectedIndex(i)}
                        className="mt-0.5 accent-primary"
                      />
                      <span className="text-sm font-medium">{reply.label}</span>
                    </label>
                    {selectedIndex === i && (
                      <div className="ml-6 mt-1 space-y-0.5">
                        <p className="text-xs text-muted-foreground">
                          <span className="text-green-600 dark:text-green-400 not-italic">✓</span>{' '}
                          {reply.pros}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-amber-500 not-italic">⚠</span>{' '}
                          {reply.cons}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3 — Your reply */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your reply</Label>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={8}
              className="resize-none text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground text-right">
              {replyText.length} characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="min-w-[110px]"
          >
            {copied ? 'Copied! ✓' : 'Copy Reply'}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(opportunity.url, '_blank')}
            >
              Open {platformLabel}
            </Button>
            <Button
              size="sm"
              onClick={handleMarkReplied}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : 'Mark as Replied'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

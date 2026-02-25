'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface BuyModalProps {
  isOpen: boolean
  onClose: () => void
}

const FEATURES = [
  'Daily digest of high-intent opportunities',
  'AI relevance filtering',
  'Reddit + HN monitoring',
  'Cancel anytime',
]

export default function BuyModal({ isOpen, onClose }: BuyModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubscribe() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setIsLoading(false)
      }
    } catch {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>LaunchRadar Pro — $19 / month</DialogTitle>
        </DialogHeader>

        <ul className="my-4 space-y-2 text-sm text-muted-foreground">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="text-green-600 font-medium">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSubscribe} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting…
              </>
            ) : (
              'Start Subscription'
            )}
          </Button>
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

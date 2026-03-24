'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const [productDescription, setProductDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'save-and-scan', productDescription }),
      })
      window.location.href = '/dashboard?scanning=true'
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">What does your product do?</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll find Reddit &amp; HN discussions where people need it.
          </p>
        </div>

        <div className="space-y-2">
          <Textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="e.g. A tool that helps indie hackers find their first customers by monitoring Reddit for people asking about growth and distribution"
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {productDescription.length} characters
          </p>
        </div>

        <Button
          className="w-full"
          disabled={productDescription.trim().length < 20 || loading}
          onClick={handleSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up your radar…
            </>
          ) : (
            'Start Scanning →'
          )}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState, KeyboardEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, X } from 'lucide-react'

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [productDescription, setProductDescription] = useState('')
  const [targetCustomer, setTargetCustomer] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [subreddits, setSubreddits] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [subredditInput, setSubredditInput] = useState('')

  async function handleGenerateKeywords() {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'generate-keywords',
          productDescription,
          targetCustomer,
        }),
      })
      const data = await res.json()
      setKeywords(data.keywords ?? [])
      setSubreddits(data.subreddits ?? [])
      setCurrentStep(3)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'save',
          productDescription,
          targetCustomer,
          keywords,
          subreddits,
        }),
      })
      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw))
  }

  function addKeyword(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const value = keywordInput.trim()
    if (value && !keywords.includes(value)) {
      setKeywords((prev) => [...prev, value])
    }
    setKeywordInput('')
  }

  function removeSubreddit(sub: string) {
    setSubreddits((prev) => prev.filter((s) => s !== sub))
  }

  function addSubreddit(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const value = subredditInput.trim().replace(/^r\//, '')
    if (value && !subreddits.includes(value)) {
      setSubreddits((prev) => [...prev, value])
    }
    setSubredditInput('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl space-y-6">

        {/* Progress */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            Step {currentStep} of 3
          </p>
          <div className="flex gap-2">
            {([1, 2, 3] as Step[]).map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>What does your product do?</CardTitle>
              <CardDescription>
                Describe it in plain language — we'll use this to find relevant conversations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="I built a tool that helps indie hackers find their first customers on Reddit by..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {productDescription.length} characters
                </p>
              </div>
              <Button
                className="w-full"
                disabled={productDescription.trim() === ''}
                onClick={() => setCurrentStep(2)}
              >
                Next →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Who is your target customer?</CardTitle>
              <CardDescription>
                Describe the person most likely to pay for your product.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={targetCustomer}
                  onChange={(e) => setTargetCustomer(e.target.value)}
                  placeholder="Indie hackers and solo founders who just launched a product and need their first 10 customers"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {targetCustomer.length} characters
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentStep(1)}
                >
                  ← Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={targetCustomer.trim() === '' || loading}
                  onClick={handleGenerateKeywords}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    'Generate Keywords →'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3 */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Review your monitoring setup</CardTitle>
              <CardDescription>
                Remove anything that doesn't fit. Add your own by pressing Enter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Keywords */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                      {kw}
                      <button
                        onClick={() => removeKeyword(kw)}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        aria-label={`Remove ${kw}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={addKeyword}
                  placeholder="Add a keyword and press Enter"
                />
              </div>

              {/* Subreddits */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Subreddits</p>
                <div className="flex flex-wrap gap-2">
                  {subreddits.map((sub) => (
                    <Badge key={sub} variant="secondary" className="gap-1 pr-1">
                      r/{sub}
                      <button
                        onClick={() => removeSubreddit(sub)}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        aria-label={`Remove r/${sub}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  value={subredditInput}
                  onChange={(e) => setSubredditInput(e.target.value)}
                  onKeyDown={addSubreddit}
                  placeholder="Add a subreddit (with or without r/) and press Enter"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                  onClick={() => setCurrentStep(2)}
                >
                  ← Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={keywords.length === 0 || loading}
                  onClick={handleSave}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Start Monitoring →'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}

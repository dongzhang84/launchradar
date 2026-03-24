'use client'

import { useState, type KeyboardEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
// import BuyModal from '@/components/BuyModal'  // PERSONAL TOOL: Stripe disabled
import { Loader2, X } from 'lucide-react'

interface ProfileData {
  productDescription: string
  targetCustomer: string
  keywords: string[]
  subreddits: string[]
  emailEnabled: boolean
  digestTime: number
  // subscriptionStatus: string | null  // PERSONAL TOOL: Stripe disabled
  // trialEndsAt: string | null          // PERSONAL TOOL: Stripe disabled
}

interface Props {
  profile: ProfileData
}

async function patchSettings(data: Record<string, unknown>) {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Save failed')
}

function useSavedFeedback() {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function run(fn: () => Promise<void>) {
    setSaving(true)
    try {
      await fn()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return { saved, saving, run }
}

export default function SettingsClient({ profile }: Props) {
  // ── Section 1: Product Info ──────────────────────────────────────────────
  const [productDescription, setProductDescription] = useState(profile.productDescription)
  const [targetCustomer, setTargetCustomer] = useState(profile.targetCustomer)
  const [regenerating, setRegenerating] = useState(false)
  const product = useSavedFeedback()

  // ── Section 2: Keywords & Subreddits ────────────────────────────────────
  const [keywords, setKeywords] = useState(profile.keywords)
  const [subreddits, setSubreddits] = useState(profile.subreddits)
  const [keywordInput, setKeywordInput] = useState('')
  const [subredditInput, setSubredditInput] = useState('')
  const monitoring = useSavedFeedback()

  // ── Section 3: Email Preferences ────────────────────────────────────────
  const [emailEnabled, setEmailEnabled] = useState(profile.emailEnabled)
  const [digestTime] = useState(profile.digestTime)
  const email = useSavedFeedback()

  // ── Section 4: Subscription ── PERSONAL TOOL: disabled ──────────────────
  // const [upgradeOpen, setUpgradeOpen] = useState(false)
  // const now = new Date()
  // const trialEndsAt = profile.trialEndsAt ? new Date(profile.trialEndsAt) : null
  // const daysLeft = trialEndsAt
  //   ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  //   : 0

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleRegenerateKeywords() {
    setRegenerating(true)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'generate-keywords', productDescription, targetCustomer }),
      })
      const data = await res.json()
      setKeywords(data.keywords ?? [])
      setSubreddits(data.subreddits ?? [])
    } finally {
      setRegenerating(false)
    }
  }

  function handleAddKeyword(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const value = keywordInput.trim()
    if (value && !keywords.includes(value)) setKeywords((prev) => [...prev, value])
    setKeywordInput('')
  }

  function handleAddSubreddit(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const value = subredditInput.trim().replace(/^r\//, '')
    if (value && !subreddits.includes(value)) setSubreddits((prev) => [...prev, value])
    setSubredditInput('')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Dashboard
        </a>
      </div>

      {/* ── Section 1: Product Info ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Product Info</CardTitle>
          <CardDescription>
            Describe your product and target customer. We use this to find relevant conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Product description</Label>
            <Textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={4}
              placeholder="Describe what your product does…"
            />
          </div>
          <div className="space-y-2">
            <Label>Target customer</Label>
            <Textarea
              value={targetCustomer}
              onChange={(e) => setTargetCustomer(e.target.value)}
              rows={3}
              placeholder="Who is most likely to pay for your product?"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateKeywords}
              disabled={regenerating || !productDescription.trim() || !targetCustomer.trim()}
            >
              {regenerating ? (
                <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Regenerating…</>
              ) : (
                'Re-generate Keywords'
              )}
            </Button>
            <Button
              size="sm"
              disabled={product.saving}
              onClick={() => product.run(() => patchSettings({ productDescription, targetCustomer }))}
            >
              {product.saving ? (
                <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Saving…</>
              ) : product.saved ? (
                'Saved ✓'
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Keywords & Subreddits ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Keywords &amp; Subreddits</CardTitle>
          <CardDescription>
            Posts matching these keywords across these subreddits will be scored for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Keywords */}
          <div className="space-y-3">
            <Label>Keywords</Label>
            <div className="flex flex-wrap gap-2 min-h-[2rem]">
              {keywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                  {kw}
                  <button
                    onClick={() => setKeywords((prev) => prev.filter((k) => k !== kw))}
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
              onKeyDown={handleAddKeyword}
              placeholder="Add a keyword and press Enter"
            />
          </div>

          {/* Subreddits */}
          <div className="space-y-3">
            <Label>Subreddits</Label>
            <div className="flex flex-wrap gap-2 min-h-[2rem]">
              {subreddits.map((sub) => (
                <Badge key={sub} variant="secondary" className="gap-1 pr-1">
                  r/{sub}
                  <button
                    onClick={() => setSubreddits((prev) => prev.filter((s) => s !== sub))}
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
              onKeyDown={handleAddSubreddit}
              placeholder="Add a subreddit (with or without r/) and press Enter"
            />
          </div>

          <Button
            size="sm"
            disabled={monitoring.saving}
            onClick={() => monitoring.run(() => patchSettings({ keywords, subreddits }))}
          >
            {monitoring.saving ? (
              <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Saving…</>
            ) : monitoring.saved ? (
              'Saved ✓'
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Section 3: Email Preferences ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>
            Control when and how you receive your opportunity digest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Daily digest emails</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive a daily summary of new opportunities
              </p>
            </div>
            <button
              role="switch"
              aria-checked={emailEnabled}
              onClick={() => setEmailEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                emailEnabled ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  emailEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Delivery time */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delivery time</p>
              <p className="text-xs text-muted-foreground mt-0.5">When your digest is sent</p>
            </div>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
              {digestTime}:00 UTC
            </span>
          </div>

          <Button
            size="sm"
            disabled={email.saving}
            onClick={() => email.run(() => patchSettings({ emailEnabled, digestTime }))}
          >
            {email.saving ? (
              <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Saving…</>
            ) : email.saved ? (
              'Saved ✓'
            ) : (
              'Save'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Section 4: Subscription ── PERSONAL TOOL: disabled ────────── */}
      {/*
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Status</span>
            {profile.subscriptionStatus === 'active' ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Active
              </span>
            ) : daysLeft > 0 ? (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                Trial Expired
              </span>
            )}
          </div>

          {profile.subscriptionStatus !== 'active' && (
            <Button size="sm" onClick={() => setUpgradeOpen(true)}>
              Upgrade to Pro
            </Button>
          )}
        </CardContent>
      </Card>

      <BuyModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      */}
    </div>
  )
}

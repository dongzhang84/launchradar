import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === 'true'

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">LaunchRadar</span>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/auth/login" className="text-gray-500 hover:text-gray-900">
              Sign in
            </Link>
            {registrationOpen && (
              <Link
                href="/auth/register"
                className="rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
              >
                Start Free Trial
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-gray-400">
          Reddit + HN lead monitoring
        </p>
        <h1 className="mx-auto max-w-2xl text-5xl font-bold leading-tight tracking-tight">
          Stop scrolling Reddit for hours. Find customers in 15 minutes.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-500 leading-relaxed">
          LaunchRadar monitors Reddit &amp; HN and sends you 3–5 high-intent leads daily —
          with suggested replies.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3">
          {registrationOpen ? (
            <>
              <Link
                href="/auth/register"
                className="rounded-lg bg-gray-900 px-8 py-3.5 text-base font-semibold text-white hover:bg-gray-700 transition-colors"
              >
                Start Free Trial →
              </Link>
              <p className="text-sm text-gray-400">7-day free trial · No credit card required</p>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-lg bg-gray-900 px-8 py-3.5 text-base font-semibold text-white hover:bg-gray-700 transition-colors"
            >
              Login →
            </Link>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-2xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Describe your product',
                body: "2-minute setup. Tell us what you built and who it's for.",
              },
              {
                step: '2',
                title: 'AI monitors Reddit + HN',
                body: "We scan subreddits and Hacker News 24/7 so you don't have to.",
              },
              {
                step: '3',
                title: 'Get a daily digest',
                body: 'Wake up to 3–5 high-intent threads with a suggested reply for each.',
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  {step}
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — hidden when registration is closed */}
      {registrationOpen && (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-sm text-center">
            <h2 className="mb-10 text-2xl font-bold tracking-tight">Simple pricing</h2>
            <div className="rounded-2xl border border-gray-200 p-8 shadow-sm">
              <p className="text-5xl font-bold tracking-tight">$19</p>
              <p className="mt-1 text-gray-400">per month</p>
              <ul className="my-8 space-y-3 text-sm text-gray-600 text-left">
                {[
                  'Daily digest of 3–5 high-intent leads',
                  'AI-generated reply suggestions',
                  'Reddit + Hacker News monitoring',
                  'Unlimited keywords & subreddits',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 text-gray-900 font-bold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className="block w-full rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
              >
                Start Free Trial →
              </Link>
              <p className="mt-3 text-xs text-gray-400">7-day free trial · Cancel anytime</p>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
          <div className="space-y-8">
            {[
              {
                q: 'How is this different from F5Bot?',
                a: 'F5Bot sends 100+ alerts per day. LaunchRadar uses AI to filter down to 3–5 high-intent discussions where someone is actually looking for a solution like yours.',
              },
              {
                q: 'Will I get banned from Reddit?',
                a: "No. We find threads for you — you reply manually in your own voice. There's no automation of your Reddit account.",
              },
              {
                q: 'What products work best?',
                a: 'B2B SaaS, tools, and services targeting indie hackers and developers. If your customers hang out on Reddit or HN, LaunchRadar will find them.',
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="mb-2 font-semibold">{q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between text-xs text-gray-400">
          <span>Made by [your name]</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}

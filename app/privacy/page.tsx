import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 prose prose-gray">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 no-underline">
        ← LaunchRadar
      </Link>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: {new Date().getFullYear()}</p>

      <h2 className="text-lg font-semibold mt-8">Information we collect</h2>
      <p>
        We collect your email address when you register. We also store your product
        description, target customer, keywords, and subreddits that you provide
        during onboarding to power the monitoring service.
      </p>

      <h2 className="text-lg font-semibold mt-8">How we use your information</h2>
      <p>
        Your product description and keywords are used solely to search Reddit and
        Hacker News for relevant discussions and to score those discussions for
        relevance using AI. We do not sell your data to third parties.
      </p>

      <h2 className="text-lg font-semibold mt-8">Third-party services</h2>
      <p>
        We use Supabase for authentication and database storage, OpenAI to generate
        relevance scores and reply suggestions, and Resend to deliver email digests.
      </p>

      <h2 className="text-lg font-semibold mt-8">Data retention</h2>
      <p>
        You can delete your account at any time by contacting us. All associated
        data will be permanently removed within 30 days.
      </p>

      <h2 className="text-lg font-semibold mt-8">Contact</h2>
      <p>
        Questions? Email us at{' '}
        <a href="mailto:hello@launchradar.app" className="underline">
          hello@launchradar.app
        </a>
        .
      </p>
    </div>
  )
}

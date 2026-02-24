import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 prose prose-gray">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 no-underline">
        ← LaunchRadar
      </Link>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="text-sm text-gray-500">Last updated: {new Date().getFullYear()}</p>

      <h2 className="text-lg font-semibold mt-8">Acceptance of terms</h2>
      <p>
        By creating an account and using LaunchRadar, you agree to these Terms of
        Service. If you do not agree, please do not use the service.
      </p>

      <h2 className="text-lg font-semibold mt-8">Description of service</h2>
      <p>
        LaunchRadar monitors Reddit and Hacker News for discussions relevant to your
        product and delivers a daily digest of opportunities via email and a web
        dashboard.
      </p>

      <h2 className="text-lg font-semibold mt-8">Acceptable use</h2>
      <p>
        You agree to use LaunchRadar only for lawful purposes. You may not use the
        service to send spam, harass other users, or violate Reddit's or Hacker
        News's terms of service when engaging with content we surface.
      </p>

      <h2 className="text-lg font-semibold mt-8">Subscription and billing</h2>
      <p>
        LaunchRadar offers a 7-day free trial. After the trial, continued access
        requires an active paid subscription. Subscriptions are billed monthly and
        can be cancelled at any time; no refunds are issued for partial months.
      </p>

      <h2 className="text-lg font-semibold mt-8">Disclaimer of warranties</h2>
      <p>
        The service is provided "as is" without warranties of any kind. We do not
        guarantee that every opportunity surfaced will result in a customer, or that
        the service will be uninterrupted or error-free.
      </p>

      <h2 className="text-lg font-semibold mt-8">Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, LaunchRadar shall not be liable for
        any indirect, incidental, or consequential damages arising from your use of
        the service.
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

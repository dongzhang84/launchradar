import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-5xl font-semibold text-gray-200">404</p>
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you were looking for does not exist.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 text-sm font-medium underline underline-offset-4 hover:text-muted-foreground transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}

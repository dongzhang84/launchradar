// PERSONAL TOOL: Registration is gated by NEXT_PUBLIC_REGISTRATION_OPEN env var.
// Set NEXT_PUBLIC_REGISTRATION_OPEN=true in .env.local to temporarily allow sign-ups.
import { redirect } from 'next/navigation'
import RegisterForm from './RegisterForm'

export default function RegisterPage() {
  if (process.env.NEXT_PUBLIC_REGISTRATION_OPEN !== 'true') {
    redirect('/auth/login')
  }

  return <RegisterForm />
}

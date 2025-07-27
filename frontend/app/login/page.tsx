'use client'

import { LoginForm } from '@/components/auth/login-form'

export default function Login() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12">
      <LoginForm />
    </div>
  )
}
'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CallbackPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-flrqfrzgvranidndzeiy-auth-token',
        secure: true,
        sameSite: 'Lax',
      },
    }
  )

  useEffect(() => {
    const handleCallback = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        // User is logged in, redirect to dashboard
        router.push('/dashboard')
      } else {
        // Handle error or redirect to login
        router.push('/login?error=oauth_failed')
      }
    }

    handleCallback()
  }, [router, supabase])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12">
      <p>Loading...</p>
    </div>
  )
}

'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

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

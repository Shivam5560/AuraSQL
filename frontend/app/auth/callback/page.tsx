'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Redirect to dashboard on successful sign-in
        router.push('/dashboard')
      } else if (event === 'USER_UPDATED') {
        // This event fires after email confirmation
        // Redirect to a page that informs the user and prompts them to log in
        router.push('/login?message=Email confirmed. You can now log in.')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <p className="text-foreground">Please wait while we confirm your email address...</p>
    </div>
  )
}
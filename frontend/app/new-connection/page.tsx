'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseClient, Session } from '@supabase/auth-helpers-react'
import { DbConnectionForm } from '@/components/db-connection-form'
import { Loader2 } from 'lucide-react'

interface DbConfig {
  db_type: string
  ip: string
  port: number
  username: string
  password?: string
  database: string
  schema_name: string
  table_name: string
}

export default function NewConnectionPage() {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setLoadingSession(false)
    }
    getSession()
  }, [supabase])

  useEffect(() => {
    if (!loadingSession && !session) {
      router.push('/login')
    }
  }, [session, loadingSession, router])

  const handleSubmit = async (config: DbConfig) => {
    setIsLoading(true)
    setError(null)

    try {
      // This part is largely handled by the DbConnectionForm itself now for saving
      // For connecting, we just set the localStorage and redirect
      localStorage.setItem('currentDbConfig', JSON.stringify(config))
      router.push('/') // Redirect to the main query interface
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingSession) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="mt-4 text-lg">Loading...</p>
      </main>
    )
  }

  if (!session) {
    return null // Should be redirected by useEffect
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
      <DbConnectionForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        session={session}
      />
    </main>
  )
}

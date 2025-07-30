'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from '@supabase/auth-helpers-react'
import { createClient } from '@/lib/supabase/client'
import { DbConnectionForm } from '@/components/db-connection-form'
import { Loader2 } from 'lucide-react'
import { DbConfig } from '@/lib/types'

export default function NewConnectionPage() {
  const router = useRouter()
  const supabase = createClient()
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
    console.log("Sending config to /connect:", config)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to connect to database.');
      }

      const result = await response.json();
      const schemaString = JSON.stringify(result.schema);

      // Separate password from config for storage
      const { password, id, ...connectionDetails } = config; // Destructure 'id' to exclude it

      // Save connection details to Supabase
      const { data: connectionData, error: connectionError } = await supabase
        .from('connections')
        .insert({ ...connectionDetails, user_id: session?.user?.id })
        .select()
        .single();

      if (connectionError) {
        throw new Error(`Failed to save connection: ${connectionError.message}`);
      }

      // Save secret (password) to Supabase
      const { error: secretError } = await supabase
        .from('secrets')
        .insert({ connection_id: connectionData.id, password: password });

      if (secretError) {
        throw new Error(`Failed to save secret: ${secretError.message}`);
      }

      router.push(`/query-interface?connection_id=${connectionData.id}&schema=${encodeURIComponent(schemaString)}`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      // No need to throw err here, as we are handling the error display
    } finally {
      setIsLoading(false);
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

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DbConnectionForm } from '@/components/db-connection-form'
import { Loader2 } from 'lucide-react'
import { DbConfig } from '@/lib/types'

export default function EditConnectionPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [initialData, setInitialData] = useState<DbConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const id = params.id as string

  useEffect(() => {
    const fetchConnection = async () => {
      if (!id) return
      setLoading(true)
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setError('Failed to fetch connection details.')
        console.error(error)
      } else {
        const { data: secretData, error: secretError } = await supabase
          .from('secrets')
          .select('password')
          .eq('connection_id', id)
          .single();

        if (secretError) {
          console.error('Error fetching secret:', secretError);
          // Don't block if secret not found, just don't pre-fill password
        }
        setInitialData({ ...data as DbConfig, password: secretData?.password || '' });
      }
      setLoading(false)
    }
    fetchConnection()
  }, [id, supabase])

  const handleSubmit = async (config: DbConfig) => {
    setLoading(true)
    setError(null)
    try {
      const { password, ...connectionConfig } = config;

      const { error: connectionError } = await supabase
        .from('connections')
        .update(connectionConfig)
        .eq('id', id);

      if (connectionError) {
        throw connectionError;
      }

      if (password) {
        const { error: secretError } = await supabase
          .from('secrets')
          .update({ password })
          .eq('connection_id', id);

        if (secretError) {
          throw secretError;
        }
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="mt-4 text-lg">Loading connection...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-lg text-red-500">{error}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
      <DbConnectionForm
        onSubmit={handleSubmit}
        isLoading={loading}
        error={error}
        session={null} // Session is not needed for editing
        initialData={initialData!}
      />
    </main>
  )
}

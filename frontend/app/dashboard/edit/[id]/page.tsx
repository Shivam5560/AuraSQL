'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Session } from '@supabase/supabase-js'
import { DbConnectionForm } from '@/components/db-connection-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

import { DbConfig } from '@/lib/types'

export default function EditConnectionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [connection, setConnection] = useState<DbConfig | null>(null)
  const [loadingConnection, setLoadingConnection] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const connectionId = params.id

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

  useEffect(() => {
    const fetchConnection = async () => {
      if (!session?.user?.id || !connectionId) return
      setLoadingConnection(true)
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        console.error('Error fetching connection:', error)
        setError(error.message)
      } else if (data) {
        // Fetch password from secrets table
        const { data: secretData, error: secretError } = await supabase
          .from('secrets')
          .select('password')
          .eq('connection_id', connectionId)
          .single()

        if (secretError) {
          console.error('Error fetching secret:', secretError)
          // Don't set error for password not found, just leave it empty
        }

        setConnection({ ...data, password: secretData?.password || '' })
      }
      setLoadingConnection(false)
    }
    if (session && connectionId) {
      fetchConnection()
    }
  }, [session, connectionId, supabase])

  const handleUpdateConnection = async (updatedConfig: DbConfig) => {
    if (!session?.user?.id || !connectionId) return
    setError(null)

    // Update connections table
    const { error: connectionError } = await supabase
      .from('connections')
      .update({
        name: updatedConfig.name,
        db_type: updatedConfig.db_type,
        ip: updatedConfig.ip,
        port: updatedConfig.port,
        username: updatedConfig.username,
        database: updatedConfig.database,
        schema_name: updatedConfig.schema_name,
        table_name: updatedConfig.table_name,
      })
      .eq('id', connectionId)
      .eq('user_id', session.user.id)

    if (connectionError) {
      console.error('Error updating connection:', connectionError)
      setError(connectionError.message)
      return
    }

    // Update or insert password in secrets table
    if (updatedConfig.password) {
      const { data: existingSecret, error: fetchSecretError } = await supabase
        .from('secrets')
        .select('id')
        .eq('connection_id', connectionId)
        .single()

      if (fetchSecretError && fetchSecretError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error checking existing secret:', fetchSecretError)
        setError(fetchSecretError.message)
        return
      }

      if (existingSecret) {
        const { error: updateSecretError } = await supabase
          .from('secrets')
          .update({ password: updatedConfig.password })
          .eq('id', existingSecret.id)
        if (updateSecretError) {
          console.error('Error updating secret:', updateSecretError)
          setError(updateSecretError.message)
          return
        }
      } else {
        const { error: insertSecretError } = await supabase
          .from('secrets')
          .insert({
            connection_id: connectionId,
            password: updatedConfig.password,
          })
        if (insertSecretError) {
          console.error('Error inserting secret:', insertSecretError)
          setError(insertSecretError.message)
          return
        }
      }
    }

    alert('Connection updated successfully!')
    window.location.href = '/dashboard'
  }

  if (loadingSession || loadingConnection) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="mt-4 text-lg">Loading connection details...</p>
      </main>
    )
  }

  if (!session) {
    return null // Should be redirected by useEffect
  }

  if (!connection) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-lg text-red-500">Connection not found or you do not have permission to view it.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
      <Card className="w-full max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Edit Connection: {connection.name}</CardTitle>
          <CardDescription>Update your database connection details.</CardDescription>
        </CardHeader>
        <CardContent>
          <DbConnectionForm
            onSubmit={handleUpdateConnection}
            isLoading={false} // Adjust as needed for update loading state
            error={error}
            session={session}
            initialData={connection}
          />
        </CardContent>
      </Card>
    </main>
  )
}

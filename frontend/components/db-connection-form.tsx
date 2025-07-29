"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSupabase } from '@/components/supabase-provider'
import { Session } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

import { DbConfig } from '@/lib/types'

interface DbConnectionFormProps {
  onSubmit: (config: DbConfig) => Promise<void>
  isLoading: boolean
  error: string | null
  session: Session | null
  initialData?: DbConfig // Added for editing
}

export function DbConnectionForm({ onSubmit, isLoading, error, session, initialData }: DbConnectionFormProps) {
  const supabase = useSupabaseClient()
  const [savedConnections, setSavedConnections] = useState<DbConfig[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("")

  useEffect(() => {
    if (!initialData) {
      const fetchConnections = async () => {
        if (!session?.user?.id) return
        const { data, error } = await supabase
          .from('connections')
          .select('*')
          .eq('user_id', session.user.id)

        if (error) {
          console.error('Error fetching connections:', error)
        } else if (data) {
          setSavedConnections(data)
        }
      }
      fetchConnections()
    }
  }, [session, supabase, initialData])
  const [dbType, setDbType] = useState(initialData?.db_type || "postgresql")
  const [ip, setIp] = useState(initialData?.ip || "localhost")
  const [port, setPort] = useState(String(initialData?.port || "5432"))
  const [username, setUsername] = useState(initialData?.username || "shivamsourav")
  const [password, setPassword] = useState(initialData?.password ?? "")
  const [database, setDatabase] = useState(initialData?.database ?? "postgres")
  const [schemaName, setSchemaName] = useState(initialData?.schema_name || "public")
  const [tableName, setTableName] = useState(initialData?.table_name || "sales")
  const [saveConnection, setSaveConnection] = useState(!!initialData)
  const [connectionName, setConnectionName] = useState(initialData?.name ?? "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const config: DbConfig = {
      id: initialData?.id ?? "",
      name: initialData?.name ?? "",
      db_type: dbType,
      ip,
      port: Number.parseInt(port),
      username,
      password,
      database,
      schema_name: schemaName,
      table_name: tableName,
    }
    onSubmit(config)

    if (saveConnection && session?.user?.id) {
      const { data: connectionData, error: connectionError } = await supabase
        .from('connections')
        .insert({
          user_id: session.user.id,
          name: connectionName,
          db_type: dbType,
          ip,
          port: Number.parseInt(port),
          username,
          database,
          schema_name: schemaName,
          table_name: tableName,
        })
        .select()
        .single()

      if (connectionError) {
        console.error('Error saving connection:', connectionError)
        // Optionally, set an error state for the form
      } else if (connectionData && password) {
        const { error: secretError } = await supabase
          .from('secrets')
          .insert({
            connection_id: connectionData.id,
            password,
          })
        if (secretError) {
          console.error('Error saving password:', secretError)
          // Optionally, set an error state for the form
        }
      }
    }
  }

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Database Connection</CardTitle>
        <CardDescription>Enter your database connection details to connect and register schema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="savedConnection">Saved Connections</Label>
            <Select
              value={selectedConnectionId || ""}
              onValueChange={async (value) => {
                setSelectedConnectionId(value)
                if (value === "new") {
                  setDbType("postgresql")
                  setIp("localhost")
                  setPort("5432")
                  setUsername("shivamsourav")
                  setPassword("")
                  setDatabase("postgres")
                  setSchemaName("public")
                  setTableName("sales")
                  setConnectionName("")
                  setSaveConnection(false)
                } else {
                  const selected = savedConnections.find(conn => conn.id === value)
                  if (selected) {
                    setDbType(selected.db_type)
                    setIp(selected.ip)
                    setPort(String(selected.port))
                    setUsername(selected.username)
                    setDatabase(selected.database ?? "")
                    setSchemaName(selected.schema_name)
                    setTableName(selected.table_name)
                    setConnectionName(selected.name ?? "")
                    setSaveConnection(true)

                    // Fetch password from secrets table
                    const { data: secretData, error: secretError } = await supabase
                      .from('secrets')
                      .select('password')
                      .eq('connection_id', selected.id)
                      .single()

                    if (secretError) {
                      console.error('Error fetching secret:', secretError)
                      setPassword("") // Clear password if not found or error
                    } else if (secretData) {
                      setPassword(secretData.password ?? "")
                    }
                  }
                }
              }}
            >
              <SelectTrigger id="savedConnection" className="w-full">
                <SelectValue placeholder="Select a saved connection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Connection</SelectItem>
                {savedConnections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    {conn.name ?? ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dbType">Database Type</Label>
            <Select value={dbType} onValueChange={setDbType}>
              <SelectTrigger id="dbType" className="w-full">
                <SelectValue placeholder="Select DB Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="oracle">Oracle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip">Host/IP</Label>
            <Input id="ip" value={ip} onChange={(e) => setIp(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input id="port" type="number" value={port} onChange={(e) => setPort(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="database">Database Name</Label>
            <Input id="database" value={database} onChange={(e) => setDatabase(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schemaName">Schema Name</Label>
            <Input id="schemaName" value={schemaName} onChange={(e) => setSchemaName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tableName">Table Name</Label>
            <Input id="tableName" value={tableName} onChange={(e) => setTableName(e.target.value)} required />
          </div>
          <div className="col-span-full flex items-center space-x-2">
            <input
              type="checkbox"
              id="saveConnection"
              checked={saveConnection}
              onChange={(e) => setSaveConnection(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <Label htmlFor="saveConnection">Save Connection</Label>
          </div>
          {saveConnection && (
            <div className="col-span-full space-y-2">
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="col-span-full flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect
            </Button>
          </div>
          {error && <p className="col-span-full text-sm text-red-500">{error}</p>}
        </form>
      </CardContent>
    </Card>
  )
}
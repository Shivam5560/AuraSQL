"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

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

interface DbConnectionFormProps {
  onSubmit: (config: DbConfig) => void
  isLoading: boolean
  error: string | null
}

export function DbConnectionForm({ onSubmit, isLoading, error }: DbConnectionFormProps) {
  const [dbType, setDbType] = useState("postgresql")
  const [ip, setIp] = useState("localhost")
  const [port, setPort] = useState("5432")
  const [username, setUsername] = useState("shivamsourav")
  const [password, setPassword] = useState("")
  const [database, setDatabase] = useState("postgres")
  const [schemaName, setSchemaName] = useState("public")
  const [tableName, setTableName] = useState("sales")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const config: DbConfig = {
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
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Database Connection</CardTitle>
        <CardDescription>Enter your database connection details to extract schema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <div className="col-span-full flex justify-end pt-4">
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Extract Schema
            </Button>
          </div>
          {error && <p className="col-span-full text-sm text-red-500">{error}</p>}
        </form>
      </CardContent>
    </Card>
  )
}
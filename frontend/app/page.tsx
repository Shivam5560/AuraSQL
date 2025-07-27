"use client"

import { useState } from "react"
import { DbConnectionForm } from "@/components/db-connection-form"
import { QueryInterface } from "@/components/query-interface"
import { extractSchema, insertSchema } from "@/lib/api"

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

interface SchemaColumn {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  character_maximum_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
  constraint_type: string | null
  column_default: string | null
  db_type: string
}

interface ExtractedSchema {
  [tableName: string]: SchemaColumn[]
}

export default function Home() {
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null)
  const [extractedSchema, setExtractedSchema] = useState<ExtractedSchema | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExtractSchema = async (config: DbConfig) => {
    setIsLoading(true)
    setError(null)
    setDbConfig(config) // Store config immediately

    try {
      // 1. Extract Schema
      console.log("Attempting to extract schema with config:", config)
      const extractResult = await extractSchema(config)
      console.log("Extract schema result:", extractResult)

      if (extractResult.success && extractResult.schema) {
        setExtractedSchema(extractResult.schema)

        // 2. Insert Schema
        const tableName = config.table_name
        const schemaDetailsForInsert = { [tableName]: extractResult.schema[tableName] }
        console.log("Attempting to insert schema with details:", schemaDetailsForInsert)

        const insertResult = await insertSchema(
          config.db_type,
          config.table_name,
          config.schema_name,
          schemaDetailsForInsert,
        )
        console.log("Insert schema result:", insertResult)

        if (!insertResult.success) {
          setError(insertResult.detail || "Failed to insert schema into backend.")
          setExtractedSchema(null) // Clear schema if insertion fails
        }
      } else {
        setError(extractResult.detail || "Failed to extract schema from database.")
        setExtractedSchema(null)
      }
    } catch (err: any) {
      console.error("Error during schema extraction/insertion:", err)
      setError(`An unexpected error occurred: ${err.message}`)
      setExtractedSchema(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 lg:p-12 bg-gray-50">
      <div className="w-full max-w-4xl space-y-8">
        <h1 className="text-4xl font-bold text-center text-gray-800">Text-to-SQL AI Assistant</h1>
        <p className="text-center text-gray-600">
          Connect to your database, extract schema, generate SQL queries with AI, and execute them.
        </p>

        <DbConnectionForm onSubmit={handleExtractSchema} isLoading={isLoading} error={error} />

        {extractedSchema && dbConfig && <QueryInterface dbConfig={dbConfig} extractedSchema={extractedSchema} />}
      </div>
    </main>
  )
}
"use client"

import { Session, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DbConnectionForm } from "@/components/db-connection-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { extractSchema, insertSchema, getRecommendations, generateQuery, executeQuery } from "@/lib/api"

// --- Interfaces for your data structures ---
import { DbConfig } from '@/lib/types'

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

type Step = "connect" | "schema" | "query" | "sql" | "results"
type QueryMode = "recommendations" | "manual"

// --- Main Page Component ---
export default function Home() {
  const router = useRouter()
  const supabase = useSupabaseClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null)
  const [step, setStep] = useState<Step>("connect")

  

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('currentDbConfig')
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig)
        if (parsedConfig.db_type && parsedConfig.ip && parsedConfig.port && parsedConfig.username && parsedConfig.database && parsedConfig.schema_name && parsedConfig.table_name) {
          setDbConfig(parsedConfig)
          setStep("schema") // Proceed to schema if password is present
        } else {
          localStorage.removeItem('currentDbConfig') // Clear incomplete config
          setStep("connect")
        }
      } else {
        setStep("connect")
      }
    }
  }, [])
  const [extractedSchema, setExtractedSchema] = useState<ExtractedSchema | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [insertLoading, setInsertLoading] = useState(false)
  const [insertError, setInsertError] = useState<string | null>(null)
  const [queryMode, setQueryMode] = useState<QueryMode>("manual")
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null)
  const [manualQuery, setManualQuery] = useState("")
  const [sqlLoading, setSqlLoading] = useState(false)
  const [sqlError, setSqlError] = useState<string | null>(null)
  const [generatedSQL, setGeneratedSQL] = useState("")
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [queryResults, setQueryResults] = useState<Record<string, any>[]>([])

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

  const { setTheme, theme } = useTheme()

    

  // Step 1: Connect (extract-schema)
  const handleExtractSchema = async (config: DbConfig) => {
    setSchemaLoading(true)
    setSchemaError(null)
    setDbConfig(config)
    setExtractedSchema(null)
    try {
      const extractResult = await extractSchema(config)
      if (extractResult.success && extractResult.schema) {
        setExtractedSchema(extractResult.schema)
        setStep("schema")
      } else {
        setSchemaError(extractResult.detail || "Failed to extract schema from database.")
      }
    } catch (err: any) {
      setSchemaError(`An unexpected error occurred: ${err.message}`)
    } finally {
      setSchemaLoading(false)
    }
  }

  // Step 2: Insert schema (on continue)
  const handleInsertSchema = async () => {
    if (!dbConfig || !extractedSchema) return
    setInsertLoading(true)
    setInsertError(null)
    try {
      const tableName = dbConfig.table_name
      const schemaDetailsForInsert = { [tableName]: extractedSchema[tableName] }
      const insertResult = await insertSchema(
        dbConfig.db_type,
        dbConfig.table_name,
        dbConfig.schema_name,
        schemaDetailsForInsert,
      )
      if (insertResult.success) {
        setStep("query")
      } else {
        setInsertError(insertResult.detail || "Failed to insert schema into backend.")
      }
    } catch (err: any) {
      setInsertError(`An unexpected error occurred: ${err.message}`)
    } finally {
      setInsertLoading(false)
    }
  }

  const handleLoadRecommendations = useCallback(async () => {
    if (step !== 'query' || !dbConfig) return
    setRecommendationsLoading(true)
    setRecommendationsError(null)
    try {
      const result = await getRecommendations(dbConfig.db_type, dbConfig.table_name, dbConfig.schema_name)
      if (result.success && result.recommendations) {
        setRecommendations(result.recommendations)
      } else {
        setRecommendationsError(result.detail || "Failed to fetch recommendations.")
      }
    } catch (err: any) {
      setRecommendationsError(`Error fetching recommendations: ${err.message}`)
    } finally {
      setRecommendationsLoading(false)
    }
  }, [step, dbConfig])


  // Step 4: Generate SQL
  const handleGenerateSQL = async (query: string) => {
    if (!dbConfig) return
    setSqlLoading(true)
    setSqlError(null)
    setGeneratedSQL("")
    setQueryResults([])
    try {
      const result = await generateQuery(
        dbConfig.db_type,
        dbConfig.table_name,
        dbConfig.schema_name,
        query,
      )
      if (result.success && result.sql) {
        setGeneratedSQL(result.sql)
        setStep("sql")
        // Save query to history
        if (session?.user?.id) {
          const { error: historyError } = await supabase
            .from('query_history')
            .insert({
              user_id: session.user.id,
              natural_language_query: query,
              generated_sql: result.sql,
              status: 'generated',
            })
          if (historyError) {
            console.error('Error saving query history:', historyError)
          }
        }
      } else {
        setSqlError(result.detail || "Failed to generate SQL query.")
      }
    } catch (err: any) {
      setSqlError(`Error generating query: ${err.message}`)
    } finally {
      setSqlLoading(false)
    }
  }

  // Step 5: Execute SQL
  const handleExecuteSQL = async () => {
    if (!dbConfig || !generatedSQL) return
    setResultsLoading(true)
    setResultsError(null)
    setQueryResults([])
    try {
      const result = await executeQuery(dbConfig, generatedSQL)
      if (result.success && result.data) {
        setQueryResults(result.data)
        setStep("results")
        // Update query status to executed
        if (session?.user?.id && generatedSQL) {
          const { data: existingHistory, error: fetchHistoryError } = await supabase
            .from('query_history')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('generated_sql', generatedSQL)
            .single()

          if (fetchHistoryError) {
            console.error('Error fetching history to update status:', fetchHistoryError)
          } else if (existingHistory) {
            const { error: updateHistoryError } = await supabase
              .from('query_history')
              .update({ status: 'executed' })
              .eq('id', existingHistory.id)
            if (updateHistoryError) {
              console.error('Error updating query history status:', updateHistoryError)
            }
          }
        }
      } else {
        setResultsError(result.detail || "Failed to execute SQL query.")
      }
    } catch (err: any) {
      setResultsError(`An unexpected error occurred: ${err.message}`)
    } finally {
      setResultsLoading(false)
    }
  }

  const steps = [
    { key: "connect", label: "Connect" },
    { key: "schema", label: "Schema" },
    { key: "query", label: "Query" },
    { key: "sql", label: "SQL" },
    { key: "results", label: "Results" },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === step);

  if (loadingSession) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="mt-4 text-lg">Loading session...</p>
      </main>
    )
  }

  if (!session) {
    return null
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
          Dashboard
        </Button>
        <ThemeToggle />
        
      </div>
      <div className="w-full max-w-5xl">
        {/* --- Updated Stepper UI --- */}
        <div className="flex items-start justify-between mb-12 w-full">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center w-full">
              <div className="flex flex-col items-center text-center">
                <div
                  className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm transition-colors duration-300
                    ${i <= currentStepIndex ? "bg-primary text-primary-foreground scale-110 shadow-lg" : "bg-card text-muted-foreground border"
                  }`}>
                  {i + 1}
                </div>
                <div
                  className={`mt-2 text-xs font-semibold transition-colors duration-300 w-20 ${
                    i <= currentStepIndex ? "text-primary" : "text-muted-foreground"
                  }`}>
                  {s.label}
                </div>
              </div>
              {i < steps.length - 1 && <div className={`w-full h-1 mx-4 rounded transition-all duration-300 ${i < currentStepIndex ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === "connect" && (
            <motion.div key="connect" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <DbConnectionForm onSubmit={handleExtractSchema} isLoading={schemaLoading} error={schemaError} session={session} />
            </motion.div>
          )}

          {step === "schema" && dbConfig && extractedSchema && (
            <motion.div key="schema" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Schema for <span className="text-primary">{dbConfig.table_name}</span></CardTitle>
                  <CardDescription>Review the schema and continue to generate queries.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border mb-4">
                    <Table>
                      <TableHeader><TableRow><TableHead>Column</TableHead><TableHead>Type</TableHead><TableHead>Nullable</TableHead><TableHead>Constraint</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {extractedSchema[dbConfig.table_name]?.map((col, idx) => (
                          <TableRow key={idx}><TableCell>{col.column_name}</TableCell><TableCell>{col.data_type}</TableCell><TableCell>{col.is_nullable === "NO" ? "No" : "Yes"}</TableCell><TableCell>{col.constraint_type || "N/A"}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {insertError && <p className="text-sm text-destructive mb-2">{insertError}</p>}
                  <Button onClick={handleInsertSchema} disabled={insertLoading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    {insertLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering Schema...</> : "Continue to Query Generation"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "query" && dbConfig && (
             <motion.div key="query" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="flex gap-2 mb-4 justify-center">
                <Button
                  variant={queryMode === 'recommendations' ? 'default' : 'secondary'}
                  onClick={() => {
                    setQueryMode('recommendations')
                    setRecommendationsLoading(true)
                    handleLoadRecommendations()
                  }}
                  disabled={recommendationsLoading}
                >
                  {recommendationsLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating AI Recommendations...</> : "AI Recommendations"}
                </Button>
                <Button variant={queryMode === 'manual' ? 'default' : 'secondary'} onClick={() => setQueryMode('manual')}>Manual Query</Button>
              </div>

              {queryMode === 'recommendations' ? (
                <Card>
                  <CardHeader><CardTitle>AI Query Recommendations</CardTitle><CardDescription>Select a recommendation to generate an SQL query.</CardDescription></CardHeader>
                  <CardContent>
                    {recommendationsLoading ? (<div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...</div>
                    ) : recommendationsError ? (<p className="text-sm text-destructive">{recommendationsError}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {recommendations.map((rec, idx) => (
                          <div key={idx} className={`p-3 rounded-md cursor-pointer transition-colors border ${selectedRecommendation === rec ? "bg-accent border-primary" : "hover:bg-accent/50"}`} onClick={() => setSelectedRecommendation(rec)}>
                            <p>{rec}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90" disabled={!selectedRecommendation || sqlLoading} onClick={() => selectedRecommendation && handleGenerateSQL(selectedRecommendation)}>
                      {sqlLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate SQL for Selection"}
                    </Button>
                    {sqlError && <p className="text-sm text-destructive mt-2">{sqlError}</p>}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader><CardTitle>Manual Query</CardTitle><CardDescription>Describe your query in natural language.</CardDescription></CardHeader>
                  <CardContent>
                    <Textarea placeholder="e.g., 'Show me total sales per customer'" value={manualQuery} onChange={e => setManualQuery(e.target.value)} className="min-h-[120px] mb-4" />
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={!manualQuery.trim() || sqlLoading} onClick={() => handleGenerateSQL(manualQuery)}>
                      {sqlLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate SQL"}
                    </Button>
                    {sqlError && <p className="text-sm text-destructive mt-2">{sqlError}</p>}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {step === "sql" && generatedSQL && (
            <motion.div key="sql" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader><CardTitle>Generated SQL</CardTitle><CardDescription>Review and execute the query.</CardDescription></CardHeader>
                <CardContent>
                  <Textarea value={generatedSQL} readOnly className="min-h-[120px] font-mono bg-muted text-muted-foreground mb-4" />
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleExecuteSQL} disabled={resultsLoading}>
                    {resultsLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executing...</> : "Execute SQL Query"}
                  </Button>
                  {resultsError && <p className="text-sm text-destructive mt-2">{resultsError}</p>}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <Card>
                <CardHeader><CardTitle>Query Results</CardTitle><CardDescription>Results from your executed query.</CardDescription></CardHeader>
                <CardContent>
                  {resultsError ? (<p className="text-sm text-destructive">{resultsError}</p>
                  ) : queryResults.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader><TableRow>{Object.keys(queryResults[0]).map((key) => (<TableHead key={key}>{key}</TableHead>))}</TableRow></TableHeader>
                        <TableBody>
                          {queryResults.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>{Object.values(row).map((value, colIndex) => (<TableCell key={colIndex}>{String(value)}</TableCell>))}</TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No results to display.</p>
                  )}
                  <div className="flex gap-2 pt-4 justify-end">
                    <Button variant="outline" onClick={() => setStep("query")}>Back to Query</Button>
                    <Button variant="ghost" onClick={() => { setStep("connect"); setDbConfig(null); setExtractedSchema(null); setManualQuery(""); setGeneratedSQL(""); setQueryResults([]); setRecommendations([]); setSelectedRecommendation(null); }}>Start Over</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
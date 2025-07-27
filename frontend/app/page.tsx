"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DbConnectionForm } from "@/components/db-connection-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
// Tabs component not found, so we will use buttons for tab switching.
import { Textarea } from "@/components/ui/textarea"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { extractSchema, insertSchema, getRecommendations, generateQuery, executeQuery } from "@/lib/api"

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

type Step = "connect" | "schema" | "query" | "sql" | "results"

type QueryMode = "recommendations" | "manual"

export default function Home() {
  const [step, setStep] = useState<Step>("connect")
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null)
  const [extractedSchema, setExtractedSchema] = useState<ExtractedSchema | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [insertLoading, setInsertLoading] = useState(false)
  const [insertError, setInsertError] = useState<string | null>(null)
  const [queryMode, setQueryMode] = useState<QueryMode>("recommendations")
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
  const [theme, setTheme] = useState<'dark' | 'light'>(typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  const toggleTheme = () => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.remove('dark');
      setTheme('light');
    } else {
      html.classList.add('dark');
      setTheme('dark');
    }
  }

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

  // Step 3: Recommendations (only when user clicks tab)
  const handleLoadRecommendations = async () => {
    if (!dbConfig) return
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
  }

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
      } else {
        setResultsError(result.detail || "Failed to execute SQL query.")
      }
    } catch (err: any) {
      setResultsError(`Error executing query: ${err.message}`)
    } finally {
      setResultsLoading(false)
    }
  }

  // Stepper UI
  const steps = [
    { key: "connect", label: "Connect" },
    { key: "schema", label: "Schema" },
    { key: "query", label: "Query" },
    { key: "sql", label: "SQL" },
    { key: "results", label: "Results" },
  ]

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-2 py-8">
      <div className="w-full max-w-3xl">
        {/* Stepper */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm transition-colors duration-300
                ${step === s.key ? "bg-accent text-accent-foreground scale-110 shadow-lg" : "bg-card text-muted-foreground border border-border"}`}>{i + 1}</div>
              {i < steps.length - 1 && <div className="w-8 h-1 bg-border mx-2 rounded transition-all duration-300" />}
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          {step === "connect" && (
            <motion.div key="connect" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.4 }}>
              <DbConnectionForm onSubmit={handleExtractSchema} isLoading={schemaLoading} error={schemaError} />
            </motion.div>
          )}
          {step === "schema" && dbConfig && extractedSchema && (
            <motion.div key="schema" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.4 }}>
              <Card className="mb-6 animate-in fade-in zoom-in bg-card text-card-foreground">
                <CardHeader>
                  <CardTitle>Extracted Schema for <span className="text-accent">{dbConfig.table_name}</span></CardTitle>
                  <CardDescription>Review the schema details for the selected table.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border border-border mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Column Name</TableHead>
                          <TableHead>Data Type</TableHead>
                          <TableHead>Nullable</TableHead>
                          <TableHead>Constraint</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedSchema[dbConfig.table_name]?.map((col, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{col.column_name}</TableCell>
                            <TableCell>{col.data_type}</TableCell>
                            <TableCell>{col.is_nullable === "NO" ? "No" : "Yes"}</TableCell>
                            <TableCell>{col.constraint_type || "N/A"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {insertError && <div className="text-red-500 mb-2">{insertError}</div>}
                  <Button onClick={handleInsertSchema} disabled={insertLoading} className="w-full mt-2">
                    {insertLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Register Schema...</> : "Continue to Query Generation"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {step === "query" && dbConfig && (
            <motion.div key="query" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.4 }}>
              <Card className="mb-6 animate-in fade-in zoom-in bg-card text-card-foreground">
                <CardHeader>
                  <CardTitle>Query Generation</CardTitle>
                  <CardDescription>Choose between AI recommendations or manual query.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <Button variant={queryMode === 'recommendations' ? 'default' : 'outline'} onClick={() => { setQueryMode('recommendations'); handleLoadRecommendations(); }}>
                      AI Recommendations
                    </Button>
                    <Button variant={queryMode === 'manual' ? 'default' : 'outline'} onClick={() => setQueryMode('manual')}>
                      Manual Query
                    </Button>
                  </div>
                  {queryMode === 'recommendations' && (
                    recommendationsLoading ? (
                      <div className="flex items-center justify-center p-4 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading recommendations...</span>
                      </div>
                    ) : recommendationsError ? (
                      <div className="text-red-500">{recommendationsError}</div>
                    ) : recommendations.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {recommendations.map((rec, idx) => (
                          <div key={idx} className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${selectedRecommendation === rec ? "bg-accent/30" : "hover:bg-muted/30"}`} onClick={() => setSelectedRecommendation(rec)}>
                            <Badge variant={selectedRecommendation === rec ? "default" : "secondary"}>AI</Badge>
                            <span className="flex-1 text-foreground">{rec}</span>
                          </div>
                        ))}
                        <Button className="mt-4" disabled={!selectedRecommendation || sqlLoading} onClick={() => selectedRecommendation && handleGenerateSQL(selectedRecommendation)}>
                          {sqlLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating SQL...</> : "Generate SQL"}
                        </Button>
                        {sqlError && <div className="text-red-500 mt-2">{sqlError}</div>}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No recommendations available. Click to load.</div>
                    )
                  )}
                  {queryMode === 'manual' && (
                    <div className="flex flex-col gap-4">
                      <Textarea
                        placeholder="Describe your query in natural language..."
                        value={manualQuery}
                        onChange={e => setManualQuery(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <Button className="w-full" disabled={!manualQuery.trim() || sqlLoading} onClick={() => handleGenerateSQL(manualQuery)}>
                        {sqlLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating SQL...</> : "Generate SQL"}
                      </Button>
                      {sqlError && <div className="text-red-500 mt-2">{sqlError}</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
          {step === "sql" && generatedSQL && (
            <motion.div key="sql" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.4 }}>
              <Card className="mb-6 animate-in fade-in zoom-in bg-card text-card-foreground">
                <CardHeader>
                  <CardTitle>Generated SQL</CardTitle>
                  <CardDescription>Review and execute your SQL query.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea value={generatedSQL} readOnly className="min-h-[100px] font-mono bg-muted/30 text-foreground mb-4" />
                  <Button className="w-full" onClick={handleExecuteSQL} disabled={resultsLoading}>
                    {resultsLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executing...</> : "Execute SQL"}
                  </Button>
                  {resultsError && <div className="text-red-500 mt-2">{resultsError}</div>}
                </CardContent>
              </Card>
            </motion.div>
          )}
          {step === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: 0.4 }}>
              <Card className="mb-6 animate-in fade-in zoom-in bg-card text-card-foreground">
                <CardHeader>
                  <CardTitle>Query Results</CardTitle>
                  <CardDescription>Here are the results of your SQL query.</CardDescription>
                </CardHeader>
                <CardContent>
                  {queryResults.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(queryResults[0]).map((key) => (
                              <TableHead key={key}>{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {queryResults.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {Object.values(row).map((value, colIndex) => (
                                <TableCell key={colIndex}>{String(value)}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No results to display.</div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setStep("query")}>Back to Query</Button>
                    <Button variant="ghost" onClick={() => { setStep("connect"); setDbConfig(null); setExtractedSchema(null); setManualQuery(""); setGeneratedSQL(""); setQueryResults([]); setRecommendations([]); setSelectedRecommendation(null); setSqlError(null); setResultsError(null); setSchemaError(null); setInsertError(null); }}>Start Over</Button>
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
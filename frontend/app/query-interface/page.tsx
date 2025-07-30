'use client'

import { useEffect, useState, useRef } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Check, Loader2 } from "lucide-react"
import { getRecommendations, generateQuery, executeQuery, extractSchema, insertSchema, logGeneratedQuery, logExecutedQuery } from "@/lib/api"
import { createClient } from '@/lib/supabase/client'
import { Session } from '@supabase/supabase-js'

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

export default function QueryInterface() {
  const router = useRouter()
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null)
  const [extractedSchema, setExtractedSchema] = useState<ExtractedSchema | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  const [recommendations, setRecommendations] = useState<string[]>([])
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([])
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("")
  const [generatedSql, setGeneratedSql] = useState("")
  const [queryResults, setQueryResults] = useState<Record<string, any>[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [isLoadingQueryGeneration, setIsLoadingQueryGeneration] = useState(false)
  const [isLoadingQueryExecution, setIsLoadingQueryExecution] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'schema' | 'query' | 'results'>("schema")
  const [showAiRecommendations, setShowAiRecommendations] = useState(false)
  const [isLoadingRecommendationsDelayed, setIsLoadingRecommendationsDelayed] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Loading database configuration and schema...");

  const supabase = createClient()
  const [session, setSession] = useState<Session | null>(null)
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null)
  const recommendationsCache = useRef<Record<string, string[]>>({})

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
    }
    getSession()
  }, [supabase])

  const [schemaProcessed, setSchemaProcessed] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      setLoadingConfig(true);
      // Reset previous state
      setExtractedSchema(null);
      setDbConfig(null);
      setConfigError(null);
      setSchemaProcessed(false);

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const configParam = urlParams.get('config');
        const schemaParam = urlParams.get('schema');

        let currentConfig: DbConfig | null = null;
        let currentSchema: ExtractedSchema | null = null;

        if (configParam && schemaParam) {
          currentConfig = JSON.parse(decodeURIComponent(configParam));
          currentSchema = JSON.parse(decodeURIComponent(schemaParam));
          // Clear the URL parameters to prevent issues on subsequent reloads
          router.replace(window.location.pathname, undefined, { shallow: true });
        } else {
          const connectionIdParam = urlParams.get('connection_id');
          if (connectionIdParam) {
            const { data: connectionData, error: connectionError } = await supabase
              .from('connections')
              .select('*')
              .eq('id', connectionIdParam)
              .single();

            if (connectionError) {
              throw new Error(`Failed to fetch connection details: ${connectionError.message}`);
            }

            const { data: secretData, error: secretError } = await supabase
              .from('secrets')
              .select('password')
              .eq('connection_id', connectionIdParam)
              .single();

            if (secretError) {
              throw new Error(`Failed to fetch secret for connection: ${secretError.message}`);
            }

            currentConfig = { ...connectionData, password: secretData?.password || '' };
          }
        }

        if (currentConfig) {
          setDbConfig(currentConfig);
          if (currentSchema) {
            setExtractedSchema(currentSchema);
            setSchemaProcessed(false); // Needs processing
          } else {
            setIsLoadingSchema(true);
            const schemaResult = await extractSchema(currentConfig);
            if (schemaResult.success && schemaResult.schema) {
              setExtractedSchema(schemaResult.schema);
              setSchemaProcessed(false); // Always require processing
            } else {
              setConfigError(schemaResult.detail || "Failed to fetch schema.");
            }
            setIsLoadingSchema(false);
          }
        } else {
          setConfigError("No database configuration found. Please connect to a database first.");
        }
      } catch (e: any) {
        setConfigError(`Error loading database configuration: ${e.message}`);
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfig();

    // Remove the event listener as it's no longer needed
    const handleConnectionChange = () => {
      // This listener is now redundant, but we keep it to remove it cleanly
    };
    window.removeEventListener('connectionChanged', handleConnectionChange);

  }, []);

  const handleProcessSchema = async () => {
    if (!dbConfig || !extractedSchema) {
      setError("Database configuration or schema not loaded.");
      return;
    }
    setLoadingMessage("Processing schema and generating recommendations...");
    setIsLoadingSchema(true);
    setError(null);
    try {
      const result = await insertSchema(dbConfig.db_type, dbConfig.table_name, dbConfig.schema_name, extractedSchema);
      if (result.success) {
        setSchemaProcessed(true);
        setStep("query");
      } else {
        setError(result.detail || "Failed to process schema.");
      }
    } catch (err: any) {
      setError(`Error processing schema: ${err.message}`);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const tableName = dbConfig?.table_name || ""
  const schemaColumns = extractedSchema?.[tableName] || []

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fetchRecommendations = async () => {
      if (!dbConfig) return; // Ensure dbConfig is available

      const cacheKey = `${dbConfig.db_type}-${dbConfig.table_name}-${dbConfig.schema_name}`;
      if (recommendationsCache.current[cacheKey]) {
        setRecommendations(recommendationsCache.current[cacheKey]);
        setIsLoadingRecommendations(false);
        setIsLoadingRecommendationsDelayed(false);
        return;
      }

      setIsLoadingRecommendations(true);
      setError(null);
      try {
        const result = await getRecommendations(dbConfig.db_type, dbConfig.table_name, dbConfig.schema_name);
        if (result.success && result.recommendations) {
          setRecommendations(result.recommendations);
          recommendationsCache.current[cacheKey] = result.recommendations; // Cache the results
        } else {
          setError(result.detail || "Failed to fetch recommendations.");
        }
      } catch (err: any) {
        setError(`Error fetching recommendations: ${err.message}`);
      } finally {
        setIsLoadingRecommendations(false);
        setIsLoadingRecommendationsDelayed(false);
      }
    };

    if (showAiRecommendations && dbConfig?.table_name && dbConfig?.schema_name) {
      setIsLoadingRecommendationsDelayed(true);
      timer = setTimeout(() => {
        fetchRecommendations();
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [showAiRecommendations, dbConfig, recommendationsCache]); // Depend on dbConfig and recommendationsCache

  const toggleRecommendationSelection = (rec: string) => {
    setSelectedRecommendations((prev) =>
      prev.includes(rec) ? prev.filter((r) => r !== rec) : [...prev, rec]
    )
  }

  const handleRecommendationClick = (rec: string) => {
    setNaturalLanguageQuery(rec)
  }

  const handleGenerateQuery = async () => {
    if (!dbConfig) {
      setError("Database configuration not loaded.");
      return;
    }
    setIsLoadingQueryGeneration(true)
    setError(null)
    setGeneratedSql("")
    setQueryResults([])
    try {
      let queryInput = naturalLanguageQuery;
      if (selectedRecommendations.length > 0) {
        queryInput = selectedRecommendations.join("\n\n");
      }

      if (!queryInput.trim()) {
        setError("Please enter a natural language query or select recommendations.");
        setIsLoadingQueryGeneration(false);
        return;
      }

      const result = await generateQuery(
        dbConfig.db_type,
        dbConfig.table_name,
        dbConfig.schema_name,
        queryInput,
      )
      if (result.success && result.sql) {
        setGeneratedSql(result.sql)
        setStep("generatedSqlView")
        if (session?.user?.id) {
          const logResult = await logGeneratedQuery(session.user.id, queryInput, result.sql)
          if (logResult.success && logResult.queryId) {
            setCurrentQueryId(logResult.queryId)
          } else {
            console.error("Failed to log generated query:", logResult.detail)
          }
        }
      } else {
        setError(result.detail || "Failed to generate SQL query.")
      }
    } catch (err: any) {
      setError(`Error generating query: ${err.message}`)
    } finally {
      setIsLoadingQueryGeneration(false)
    }
  }

  const handleExecuteQuery = async () => {
    if (!generatedSql || !dbConfig) {
      setError("Please generate an SQL query and ensure database configuration is loaded.");
      return
    }
    setIsLoadingQueryExecution(true)
    setError(null)
    setQueryResults([])
    try {
      const result = await executeQuery(dbConfig, generatedSql)
      if (result.success && result.data) {
        setQueryResults(result.data)
        if (session?.user?.id && currentQueryId) {
          const logResult = await logExecutedQuery(currentQueryId, session.user.id, naturalLanguageQuery, generatedSql)
          if (!logResult.success) {
            console.error("Failed to log executed query:", logResult.detail)
          }
        }
      } else {
        setError(result.detail || "Failed to execute SQL query.")
      }
    } catch (err: any) {
      setError(`Error executing query: ${err.message}`)
    } finally {
      setIsLoadingQueryExecution(false)
      setStep("results")
    }
  }

  const clearAll = () => {
    setGeneratedSql("")
    setQueryResults([])
    setNaturalLanguageQuery("")
    setError(null)
    setSelectedRecommendations([])
  }

  const startOver = () => {
    setStep("query")
    clearAll()
    setShowAiRecommendations(false)
    setRecommendations([])
    localStorage.removeItem('currentDbConfig');
    localStorage.removeItem('newConnectionSchema');
    localStorage.removeItem('newConnectionConfig');
  }

  if (loadingConfig || isLoadingSchema) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="mt-4 text-lg">{loadingMessage}</p>
      </main>
    )
  }

  if (configError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-lg text-red-500">{configError}</p>
        <Button onClick={() => window.location.href = '/dashboard'} className="mt-4">Go to Dashboard</Button>
      </main>
    )
  }

  if (!dbConfig || !extractedSchema) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-lg text-red-500">Database configuration or schema not loaded. Please try again from the dashboard.</p>
        <Button onClick={() => window.location.href = '/dashboard'} className="mt-4">Go to Dashboard</Button>
      </main>
    )
  }

  return (
    <div className="grid gap-6 w-[90%] mx-auto py-8"> 
      {step === "schema" && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Schema for &quot;{tableName}&quot;</CardTitle>
            <CardDescription>Review the schema details for the selected table.</CardDescription>
          </CardHeader>
          <CardContent>
            {schemaColumns.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead>Column Name</TableHead>
                      <TableHead>Data Type</TableHead>
                      <TableHead>Nullable</TableHead>
                      <TableHead>Constraint</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemaColumns.map((col, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{col.column_name}</TableCell>
                        <TableCell>{col.data_type}</TableCell>
                        <TableCell>{col.is_nullable === "NO" ? "No" : "Yes"}</TableCell>
                        <TableCell>{col.constraint_type || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No schema details available for &quot;{tableName}&quot;.</p>
            )}
            <div className="flex justify-end pt-4">
              {!schemaProcessed ? (
                <Button onClick={handleProcessSchema} disabled={isLoadingSchema} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {isLoadingSchema && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue to Query Generation
                </Button>
              ) : (
                <Button onClick={() => setStep("query")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Continue to Query Generation
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "query" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Generate SQL Query</CardTitle>
              <CardDescription>Enter your natural language query to generate SQL.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., 'Show me the total sales for each product category.'"
                value={naturalLanguageQuery}
                onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                className="min-h-[120px] bg-card/50 border-border/50"
              />
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAiRecommendations(!showAiRecommendations)}
                  variant="outline"
                  className="flex-shrink-0"
                >
                  {showAiRecommendations ? "Hide" : "Show"} AI Recommendations
                </Button>
                <Button
                  onClick={handleGenerateQuery}
                  disabled={isLoadingQueryGeneration || (!naturalLanguageQuery.trim() && selectedRecommendations.length === 0)}
                  className="flex-1"
                >
                  {isLoadingQueryGeneration && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate SQL
                </Button>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </CardContent>
          </Card>

          {showAiRecommendations && (
            <Card className="border-primary/50 shadow-lg">
              <CardHeader>
                <CardTitle>AI-Generated Query Recommendations</CardTitle>
                <CardDescription>Click on recommendations to select them. Selected recommendations will be used instead of manual input.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingRecommendations || isLoadingRecommendationsDelayed ? (
                  <div className="flex items-center justify-center p-4 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>{isLoadingRecommendationsDelayed ? "Fetching recommendations in 5 seconds..." : "Loading recommendations..."}</span>
                  </div>
                ) : recommendations.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.map((rec, index) => (
                        <Badge
                          key={index}
                          variant={selectedRecommendations.includes(rec) ? "default" : "secondary"}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => toggleRecommendationSelection(rec)}
                        >
                          {rec}
                        </Badge>
                      ))}
                    </div>
                    {selectedRecommendations.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedRecommendations([])}
                          disabled={isLoadingQueryGeneration}
                          size="sm"
                        >
                          Clear Selection ({selectedRecommendations.length})
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No recommendations available.</p>
                )}
              </CardContent>
            </Card>
          )}

          {generatedSql && (
            <Card>
              <CardHeader>
                <CardTitle>Generated SQL Query</CardTitle>
                <CardDescription>Your SQL query is ready. You can now execute it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea value={generatedSql} readOnly className="min-h-[120px] font-mono bg-card/50 border-border/50" />
                <Button onClick={handleExecuteQuery} disabled={isLoadingQueryExecution} className="w-full">
                  {isLoadingQueryExecution && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Execute SQL Query
                </Button>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {queryResults.length > 0 && (
                  <div className="pt-4">
                    <h3 className="font-semibold text-lg mb-2">Query Results ({queryResults.length} rows):</h3>
                    <div className="overflow-x-auto rounded-lg border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20">
                            {Object.keys(queryResults[0]).map((key) => (
                              <TableHead key={key}>{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {queryResults.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              {Object.values(row).map((value, colIndex) => (
                                <TableCell key={colIndex}>
                                  {value === null || value === undefined ? 'NULL' : String(value)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={clearAll}>
                    Clear Generated SQL
                  </Button>
                  <Button variant="ghost" onClick={startOver}>
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {step === "generatedSqlView" && (
        <Card>
          <CardHeader>
            <CardTitle>Generated SQL Query</CardTitle>
            <CardDescription>Review the generated SQL query before execution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={generatedSql} readOnly className="min-h-[120px] font-mono bg-card/50 border-border/50" />
            <div className="flex gap-2">
              <Button onClick={handleExecuteQuery} disabled={isLoadingQueryExecution} className="flex-1">
                {isLoadingQueryExecution && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Execute SQL Query
              </Button>
              <Button variant="outline" onClick={() => setStep("query")}>
                Edit Natural Language Query
              </Button>
              <Button variant="outline" onClick={() => setStep("query")}>
                Back to Query
              </Button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      )}

      {step === "results" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Query Results</CardTitle>
            <CardDescription>Results from your executed SQL query.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {queryResults.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      {Object.keys(queryResults[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queryResults.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {Object.values(row).map((value, colIndex) => (
                          <TableCell key={colIndex}>
                            {value === null || value === undefined ? 'NULL' : String(value)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No results found for the executed query.</p>
            )}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={clearAll}>
                Clear Results
              </Button>
              <Button variant="ghost" onClick={startOver}>
                Start Over
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
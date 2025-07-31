'use client'

import { useEffect, useState, useRef } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Check, Loader2, Download } from "lucide-react"
import { 
  getRecommendations, 
  generateQuery, 
  executeQuery, 
  extractSchema, 
  createMultiTableContext, 
  listTables, 
  logGeneratedQuery, 
  logExecutedQuery 
} from "@/lib/api"
import { createClient } from '@/lib/supabase/client'
import { Session } from '@supabase/supabase-js'
import CreatableSelect from 'react-select/creatable';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface DbConfig {
  db_type: string
  ip: string
  port: number
  username: string
  password?: string
  database: string
  schema_name: string
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

interface GenerateQueryResponse {
  sql: string
  explanation: string
  source_tables: string[]
}

export default function QueryInterface() {
  const router = useRouter()
  const [dbConfig, setDbConfig] = useState<DbConfig | null>(null)
  const [availableTables, setAvailableTables] = useState<{ label: string; value: string }[]>([])
  const [selectedTables, setSelectedTables] = useState<{ label: string; value: string }[]>([])
  const [namespaceId, setNamespaceId] = useState<string | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  const [recommendations, setRecommendations] = useState<string[]>([])
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([])
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("")
  const [generatedSql, setGeneratedSql] = useState<GenerateQueryResponse | null>(null)
  const [editableSql, setEditableSql] = useState<string>("")
  const [queryResults, setQueryResults] = useState<Record<string, any>[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [isLoadingQueryGeneration, setIsLoadingQueryGeneration] = useState(false)
  const [isLoadingQueryExecution, setIsLoadingQueryExecution] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'selectTables' | 'query' | 'generatedSqlView' | 'results'>("selectTables")
  const [showAiRecommendations, setShowAiRecommendations] = useState(false)
  const [isLoadingRecommendationsDelayed, setIsLoadingRecommendationsDelayed] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Loading database configuration...");
  const [resultsDisplayLimit, setResultsDisplayLimit] = useState(10); // State for limiting results

  const supabase = createClient()
  const [session, setSession] = useState<Session | null>(null)
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null)
  const recommendationsCache = useRef<Record<string, string[]>>({})

  const effectRan = useRef(false); // Ref to track if useEffect has run

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
    }
    getSession()
  }, [supabase])

  useEffect(() => {
    if (effectRan.current === false) { // Only run once
      const loadConfigAndTables = async () => {
        setLoadingConfig(true);
        setConfigError(null);
        setDbConfig(null);
        setAvailableTables([]);
        setSelectedTables([]);
        setNamespaceId(null);
        setStep("selectTables");

        try {
          const urlParams = new URLSearchParams(window.location.search);
          const configParam = urlParams.get('config');

          let currentConfig: DbConfig | null = null;

          if (configParam) {
            currentConfig = JSON.parse(decodeURIComponent(configParam));
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

              currentConfig = { 
                db_type: connectionData.db_type,
                ip: connectionData.ip,
                port: connectionData.port,
                username: connectionData.username,
                password: secretData?.password || '',
                database: connectionData.database,
                schema_name: connectionData.schema_name,
              };
            }
          }

          if (currentConfig) {
            setDbConfig(currentConfig);
            setLoadingMessage("Fetching available tables...");
            setIsLoadingTables(true);
            const listTablesResult = await listTables(currentConfig);
            if (listTablesResult.success && listTablesResult.table_names) {
              setAvailableTables(listTablesResult.table_names.map(name => ({ label: name, value: name })));
            } else {
              setConfigError(listTablesResult.detail || "Failed to fetch table list.");
            }
            setIsLoadingTables(false);
          } else {
            setConfigError("No database configuration found. Please connect to a database first.");
          }
        } catch (e: any) {
          setConfigError(`Error loading database configuration or tables: ${e.message}`);
        } finally {
          setLoadingConfig(false);
        }
      };

      loadConfigAndTables();
      effectRan.current = true; // Mark effect as run
    }

  }, []);

  const handleCreateMultiTableContext = async () => {
    if (!dbConfig || selectedTables.length === 0) {
      setError("Please select at least one table.");
      return;
    }
    setLoadingMessage("Creating multi-table context...");
    setIsLoadingContext(true);
    setError(null);
    try {
      const tableNames = selectedTables.map(t => t.value);
      const result = await createMultiTableContext({
        ...dbConfig,
        table_names: tableNames,
      });

      if (result.success && result.namespace_id) {
        setNamespaceId(result.namespace_id);
        setStep("query");
      } else {
        setError(result.detail || "Failed to create multi-table context.");
      }
    } catch (err: any) {
      setError(`Error creating multi-table context: ${err.message}`);
    } finally {
      setIsLoadingContext(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fetchRecommendations = async () => {
      if (!namespaceId) return; 

      const cacheKey = namespaceId;
      if (recommendationsCache.current[cacheKey]) {
        setRecommendations(recommendationsCache.current[cacheKey]);
        setIsLoadingRecommendations(false);
        setIsLoadingRecommendationsDelayed(false);
        return;
      }

      setIsLoadingRecommendations(true);
      setError(null);
      try {
        const result = await getRecommendations(namespaceId);
        if (result.success && result.recommendations) {
          setRecommendations(result.recommendations);
          recommendationsCache.current[cacheKey] = result.recommendations; 
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

    if (showAiRecommendations && namespaceId) {
      setIsLoadingRecommendationsDelayed(true);
      timer = setTimeout(() => {
        fetchRecommendations();
      }, 2000);
    }

    return () => clearTimeout(timer);
  }, [showAiRecommendations, namespaceId, recommendationsCache]);

  const toggleRecommendationSelection = (rec: string) => {
    setSelectedRecommendations((prev) =>
      prev.includes(rec) ? prev.filter((r) => r !== rec) : [...prev, rec]
    )
  }

  const handleRecommendationClick = (rec: string) => {
    setNaturalLanguageQuery(rec)
  }

  const handleGenerateQuery = async () => {
    if (!namespaceId) {
      setError("Multi-table context not created. Please select tables first.");
      return;
    }
    setIsLoadingQueryGeneration(true)
    setError(null)
    setGeneratedSql(null)
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
        namespaceId,
        queryInput,
      )
      if (result.success && result.sql) {
        setGeneratedSql({ 
          sql: result.sql,
          explanation: result.explanation || "No explanation provided.",
          source_tables: result.source_tables || []
        })
        setEditableSql(result.sql) // Set editableSql here
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
    if (!editableSql || !dbConfig || selectedTables.length === 0) {
      setError("Please generate an SQL query and ensure database configuration and selected tables are loaded.");
      return
    }
    setIsLoadingQueryExecution(true)
    setError(null)
    setQueryResults([])
    try {
      // For executeQuery, we need the original DbConfig and one of the table names
      // as the backend expects it for direct SQL execution.
      // We can pick the first selected table's name, or pass an empty string if not strictly needed by backend
      const configForExecution = {
        ...dbConfig,
        table_name: selectedTables[0].value, 
      };
      const result = await executeQuery(configForExecution, editableSql)
      if (result.success && result.data) {
        setQueryResults(result.data)
        if (session?.user?.id && currentQueryId) {
          const logResult = await logExecutedQuery(currentQueryId, session.user.id, naturalLanguageQuery, editableSql)
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

  const handleDownloadSql = () => {
    if (!editableSql) return;
    const blob = new Blob([editableSql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (queryResults.length === 0) return;
    const headers = Object.keys(queryResults[0]);
    const csv = [headers.join(','), ...queryResults.map(row => headers.map(fieldName => JSON.stringify(row[fieldName])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  

  const clearAll = () => {
    setGeneratedSql(null)
    setQueryResults([])
    setNaturalLanguageQuery("")
    setError(null)
    setSelectedRecommendations([])
    setEditableSql("")
  }

  const resetQueryState = () => {
    setGeneratedSql(null)
    setQueryResults([])
    setNaturalLanguageQuery("")
    setError(null)
    setSelectedRecommendations([])
    setEditableSql("")
    setStep("query")
  }

  const resetToTableSelection = () => {
    router.push('/dashboard')
  }

  if (loadingConfig || isLoadingTables || isLoadingContext) {
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
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </main>
    )
  }

  if (!dbConfig) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-lg text-red-500">Database configuration not loaded. Please try again from the dashboard.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </main>
    )
  }

  return (
    <div className="grid gap-6 w-[90%] mx-auto py-8"> 
      {step === "selectTables" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Tables for Query Context</CardTitle>
            <CardDescription>Choose the tables relevant to your queries. Only selected tables' schemas will be used by the AI.</CardDescription>
          </CardHeader>
          <CardContent>
            {availableTables.length > 0 ? (
              <div className="space-y-4">
                <Label htmlFor="table-select">Available Tables</Label>
                <CreatableSelect
                  isMulti
                  options={availableTables}
                  value={selectedTables}
                  onChange={setSelectedTables}
                  onCreateOption={(inputValue) => {
                    const newOption = { label: inputValue, value: inputValue };
                    setSelectedTables([...selectedTables, newOption]);
                    setAvailableTables([...availableTables, newOption]);
                  }}
                  formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
                  placeholder="Type or select table names (e.g., sales, customers)"
                  noOptionsMessage={() => "No more tables to select"}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  // Custom styles to match shadcn/ui input
                  styles={{
                    control: (base) => ({
                      ...base,
                      backgroundColor: 'hsl(var(--card)/50%)',
                      borderColor: 'hsl(var(--border)/50%)',
                      color: 'hsl(var(--foreground))',
                      minHeight: '40px',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: 'hsl(var(--border))',
                      },
                    }),
                    input: (base) => ({
                      ...base,
                      color: 'hsl(var(--foreground))',
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: 'hsl(var(--muted-foreground))',
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: 'hsl(var(--foreground))',
                    }),
                    multiValue: (base) => ({
                      ...base,
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      color: 'hsl(var(--primary-foreground))',
                    }),
                    multiValueRemove: (base) => ({
                      ...base,
                      color: 'hsl(var(--primary-foreground))',
                      '&:hover': {
                        backgroundColor: 'hsl(var(--primary)/80%)',
                        color: 'hsl(var(--primary-foreground))',
                      },
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      boxShadow: 'hsl(var(--shadow))',
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                      '&:active': {
                        backgroundColor: 'hsl(var(--accent))',
                      },
                    }),
                  }}
                />
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleCreateMultiTableContext} 
                    disabled={selectedTables.length === 0 || isLoadingContext}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isLoadingContext && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Query Context
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No tables found for the selected database/schema.</p>
            )}
            {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
            <div className="flex justify-end pt-4">
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                Go to Dashboard
              </Button>
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
        </>
      )}

      {step === "generatedSqlView" && generatedSql && (
        <Card>
          <CardHeader>
            <CardTitle>Generated SQL Query</CardTitle>
            <CardDescription>Review the generated SQL query before execution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              value={editableSql}
              onChange={(e) => setEditableSql(e.target.value)}
              className="min-h-[120px] font-mono bg-card/50 border-border/50"
            />
            {generatedSql.explanation && (
              <div>
                <h3 className="font-semibold text-md mb-1">Explanation:</h3>
                <p className="text-sm text-muted-foreground">{generatedSql.explanation}</p>
              </div>
            )}
            {generatedSql.source_tables && generatedSql.source_tables.length > 0 && (
              <div>
                <h3 className="font-semibold text-md mb-1">Source Tables:</h3>
                <div className="flex flex-wrap gap-2">
                  {generatedSql.source_tables.map((table, index) => (
                    <Badge key={index} variant="outline">{table}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleExecuteQuery} disabled={isLoadingQueryExecution} className="flex-1">
                {isLoadingQueryExecution && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Execute SQL Query
              </Button>
              <Button variant="outline" onClick={resetQueryState}>
                Start New Query
              </Button>
              <Button variant="outline" onClick={handleDownloadSql}>
                <Download className="mr-2 h-4 w-4" /> Download SQL
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
                    {queryResults.slice(0, resultsDisplayLimit).map((row, rowIndex) => (
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
                {queryResults.length > resultsDisplayLimit && (
                  <div className="flex justify-center mt-4">
                    <Button variant="outline" onClick={() => setResultsDisplayLimit(prev => prev + 10)}>
                      Show More ({queryResults.length - resultsDisplayLimit} remaining)
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">No results found for the executed query.</p>
                {generatedSql?.source_tables && generatedSql.source_tables.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md">Schema for Source Tables:</h3>
                    {generatedSql.source_tables.map((tableName, idx) => (
                      <div key={idx} className="border rounded-md p-2">
                        <p className="font-medium">Table: {tableName}</p>
                        {/* Placeholder for schema columns - will fetch dynamically */}
                        <p className="text-sm text-muted-foreground">Loading schema details...</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={clearAll}>
                Clear Results
              </Button>
              <Button variant="ghost" onClick={resetQueryState}>
                Back to Query
              </Button>
              <Button variant="outline" onClick={resetToTableSelection}>
                Start Over (New Tables)
              </Button>
              {queryResults.length > 0 && (
                <Button variant="outline" onClick={handleDownloadCsv}>
                  <Download className="mr-2 h-4 w-4" /> Download CSV
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
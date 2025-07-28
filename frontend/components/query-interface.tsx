"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Check, Loader2 } from "lucide-react"
import { getRecommendations, generateQuery, executeQuery } from "@/lib/api"

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

interface QueryInterfaceProps {
  dbConfig: DbConfig
  extractedSchema: ExtractedSchema
}

export function QueryInterface({ dbConfig, extractedSchema }: QueryInterfaceProps) {
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

  const tableName = dbConfig.table_name
  const schemaColumns = extractedSchema[tableName] || []

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const fetchRecommendations = async () => {
      setIsLoadingRecommendations(true);
      setError(null);
      try {
        const result = await getRecommendations(dbConfig.db_type, dbConfig.table_name, dbConfig.schema_name);
        if (result.success && result.recommendations) {
          setRecommendations(result.recommendations);
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

    if (showAiRecommendations && dbConfig.table_name && dbConfig.schema_name) {
      setIsLoadingRecommendationsDelayed(true);
      timer = setTimeout(() => {
        fetchRecommendations();
      }, 5000);
    }

    return () => clearTimeout(timer);
  }, [showAiRecommendations, dbConfig.db_type, dbConfig.table_name, dbConfig.schema_name]);

  const toggleRecommendationSelection = (rec: string) => {
    setSelectedRecommendations((prev) =>
      prev.includes(rec) ? prev.filter((r) => r !== rec) : [...prev, rec]
    )
  }

  const handleRecommendationClick = (rec: string) => {
    setNaturalLanguageQuery(rec)
  }

  const handleGenerateQuery = async () => {
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
    if (!generatedSql) {
      setError("Please generate an SQL query first.")
      return
    }
    setIsLoadingQueryExecution(true)
    setError(null)
    setQueryResults([])
    try {
      const result = await executeQuery(dbConfig, generatedSql)
      if (result.success && result.data) {
        setQueryResults(result.data)
      } else {
        setError(result.detail || "Failed to execute SQL query.")
      }
    } catch (err: any) {
      setError(`Error executing query: ${err.message}`)
    } finally {
      setIsLoadingQueryExecution(false)
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
    setStep("schema")
    clearAll()
    setShowAiRecommendations(false)
    setRecommendations([])
  }

  return (
    <div className="grid gap-6 w-full">
      {step === "schema" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Extracted Schema for &quot;{tableName}&quot;</CardTitle>
            <CardDescription>Review the schema details for the selected table.</CardDescription>
          </CardHeader>
          <CardContent>
            {schemaColumns.length > 0 ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
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
              <Button onClick={() => setStep("query")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Continue to Query Generation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "query" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Generate SQL Query</CardTitle>
              <CardDescription>Enter your natural language query to generate SQL.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., 'Show me the total sales for each product category.'"
                value={naturalLanguageQuery}
                onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                className="min-h-[120px]"
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
            <Card className="border-primary shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">AI-Generated Query Recommendations</CardTitle>
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
                <CardTitle className="text-2xl font-semibold">Generated SQL Query</CardTitle>
                <CardDescription>Your SQL query is ready. You can now execute it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea value={generatedSql} readOnly className="min-h-[120px] font-mono bg-muted/30" />
                <Button onClick={handleExecuteQuery} disabled={isLoadingQueryExecution} className="w-full">
                  {isLoadingQueryExecution && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Execute SQL Query
                </Button>
                {error && <p className="text-sm text-red-500">{error}</p>}
                {queryResults.length > 0 && (
                  <div className="pt-4">
                    <h3 className="font-semibold text-lg mb-2">Query Results ({queryResults.length} rows):</h3>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
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
    </div>
  )
}
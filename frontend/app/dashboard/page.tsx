'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Session } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, PlusCircle, Edit, PlayCircle, Trash2 } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartHistory } from '@/components/ui/chart-history'
import { ChartDonutSql } from '@/components/ui/chart-donut-sql'
import { SectionCards } from '@/components/section-cards'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'

interface QueryHistoryItem {
  id: string
  natural_language_query: string
  generated_sql: string
  status: 'generated' | 'executed'
  created_at: string
}

import { DbConfig } from '@/lib/types'

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [connections, setConnections] = useState<DbConfig[]>([])
  const [loadingConnections, setLoadingConnections] = useState(true)
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [displayLimit, setDisplayLimit] = useState(5)

  const generatedOnlyCount = useMemo(() => queryHistory.filter(item => item.status === 'generated').length, [queryHistory]);
  const executedCount = useMemo(() => queryHistory.filter(item => item.status === 'executed').length, [queryHistory]);

  // State for sorting and filtering
  const [sortBy, setSortBy] = useState<keyof QueryHistoryItem>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState<'all' | 'generated' | 'executed'>('all')

  // Filter and sort history
  const filteredAndSortedHistory = useMemo(() => {
    let filtered = queryHistory

    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus)
    }

    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]

      if (sortBy === 'created_at') {
        const dateA = new Date(aValue as string).getTime()
        const dateB = new Date(bValue as string).getTime()
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }
      return 0
    })
    return sorted.slice(0, displayLimit)
  }, [queryHistory, sortBy, sortOrder, filterStatus, displayLimit])

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
    const fetchConnectionsAndHistory = async () => {
      if (!session?.user?.id) return

      setLoadingConnections(true)
      setLoadingHistory(true)

      // Fetch connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', session.user.id)

      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError)
      } else if (connectionsData) {
        setConnections(connectionsData.map(conn => ({
          ...conn,
          id: String(conn.id ?? ''),
          name: String(conn.name ?? ''),
          database: String(conn.database ?? ''),
        })))
      }
      setLoadingConnections(false)

      // Fetch query history
      const { data: historyData, error: historyError } = await supabase
        .from('query_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (historyError) {
        console.error('Error fetching query history:', historyError)
      } else if (historyData) {
        setQueryHistory(historyData)
      }
      setLoadingHistory(false)
    }

    if (session) {
      fetchConnectionsAndHistory()
    }
  }, [session, supabase])

  const handleConnect = async (config: DbConfig) => {
    // Fetch the secret associated with this connection
    const { data: secretData, error: secretError } = await supabase
      .from('secrets')
      .select('password')
      .eq('connection_id', config.id)
      .single();

    if (secretError) {
      console.error('Error fetching secret for connection:', secretError);
      // Optionally, show an error to the user
      return;
    }

    const fullConfig = { ...config, password: secretData?.password || '' };
    localStorage.setItem('currentDbConfig', JSON.stringify(fullConfig));
    router.push('/query-interface');
  }

  const handleEdit = (id: string) => {
    router.push(`/dashboard/edit/${id}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return
    const { error } = await supabase.from('connections').delete().eq('id', id)
    if (error) {
      console.error('Error deleting connection:', error)
    } else {
      setConnections(connections.filter(conn => conn.id !== id))
    }
  }

  const getDailyStats = (history: QueryHistoryItem[]) => {
    const dailyStats: { [key: string]: { date: string; generated: number; executed: number; total: number; percentageRise?: number } } = {}

    history.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0] // Use YYYY-MM-DD format
      if (!dailyStats[date]) {
        dailyStats[date] = { date, generated: 0, executed: 0, total: 0 }
      }
      if (item.status === 'generated') {
        dailyStats[date].generated++
      }
      if (item.status === 'executed') {
        dailyStats[date].executed++
      }
      if (item.status === 'generated' || item.status === 'executed') {
        dailyStats[date].total++
      }
    })

    const sortedDates = Object.keys(dailyStats).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

    const finalStats = sortedDates.map((date, index) => {
      const currentDay = dailyStats[date]
      if (index > 0) {
        const prevDay = dailyStats[sortedDates[index - 1]]
        const prevTotal = prevDay.total
        if (prevTotal > 0) {
          currentDay.percentageRise = ((currentDay.total - prevTotal) / prevTotal) * 100
        } else if (currentDay.total > 0) {
          currentDay.percentageRise = 100 // Infinite rise from zero
        } else {
          currentDay.percentageRise = 0
        }
      }
      return currentDay
    })

    return finalStats
  }

  if (loadingSession || loadingConnections || loadingHistory) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="mt-4 text-lg">Loading dashboard...</p>
      </main>
    )
  }

  if (!session) {
    return null // Should be redirected by useEffect
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center text-foreground pt-16">
      <div className="w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Saved Connections Section */}
          <Card className="aura-glow-hover lg:col-span-2 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">Your Saved Connections</CardTitle>
              <Button variant="outline" size="sm" onClick={() => {
                router.push('/new-connection')
              }}>
                <PlusCircle className="mr-2 h-4 w-4" /> New Connection
              </Button>
            </CardHeader>
            <CardContent>
              {connections.length === 0 ? (
                <p className="text-muted-foreground">No saved connections yet. Click "New Connection" to add one.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {connections.map((conn) => (
                    <Card key={conn.id}>
                      <CardHeader>
                        <CardTitle>{String(conn.name ?? '')}</CardTitle>
                        <CardDescription>{conn.db_type} - {String(conn.database ?? '')}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col sm:flex-row justify-between items-center gap-2">
                        <Button size="sm" onClick={() => handleConnect(conn)}>
                          <PlayCircle className="mr-2 h-4 w-4" /> Connect
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEdit(conn.id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDelete(conn.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mini Charts Section */}
          <SectionCards
            totalGeneratedQueries={queryHistory.filter(item => item.status === 'generated' || item.status === 'executed').length}
            totalExecutedQueries={queryHistory.filter(item => item.status === 'executed').length}
            className="h-full"
          />

          {/* Daily Query Activity Chart */}
          <Card className="aura-glow-hover lg:col-start-1 lg:col-span-2 h-full">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Daily Query Activity</CardTitle>
              <CardDescription>Number of queries generated/executed per day.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartHistory data={getDailyStats(queryHistory)} />
            </CardContent>
          </Card>

          {/* SQL Creation Overview */}
          <Card className="aura-glow-hover lg:col-start-3 lg:col-span-1 h-full">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">SQL Creation Overview</CardTitle>
              <CardDescription>Breakdown of generated vs. executed SQL queries.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartDonutSql generatedCount={generatedOnlyCount} executedCount={executedCount} />
            </CardContent>
          </Card>
        </div>

        {/* Query History Section */}
        <Card className="aura-glow-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">Query History</CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={filterStatus} onValueChange={(value: "all" | "generated" | "executed") => setFilterStatus(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="executed">Executed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: keyof QueryHistoryItem) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date</SelectItem>
                  <SelectItem value="natural_language_query">Natural Language Query</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(displayLimit)} onValueChange={(value) => setDisplayLimit(Number(value))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Show" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value={String(queryHistory.length)}>All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAndSortedHistory.length === 0 ? (
              <p className="text-muted-foreground">No query history available.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Natural Language Query</TableHead>
                      <TableHead>Generated SQL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'executed' ? 'default' : 'secondary'}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.natural_language_query}</TableCell>
                        <TableCell className="font-mono text-sm">{item.generated_sql}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
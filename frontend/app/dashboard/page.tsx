'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseClient, Session } from '@supabase/auth-helpers-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, PlusCircle, Edit, PlayCircle, Trash2 } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartHistory } from '@/components/ui/chart-history'
import { MiniChartCard } from '@/components/ui/mini-chart-card'
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
  const supabase = useSupabaseClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [connections, setConnections] = useState<DbConfig[]>([])
  const [loadingConnections, setLoadingConnections] = useState(true)
  const [queryHistory, setQueryHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

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
    router.push('/');
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button onClick={async () => {
          await supabase.auth.signOut()
          router.push('/login')
        }}>Logout</Button>
        <Button variant="outline" size="sm" onClick={() => router.push('/about?section=about-aurasql')}>
          About AuraSQL
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push('/about?section=developer-info')}>
          Developer
        </Button>
        <ThemeToggle />
      </div>
      <div className="w-full max-w-5xl">
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-semibold">Your Saved Connections</CardTitle>
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
                    <CardContent className="flex justify-between items-center">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <MiniChartCard
            title="Total Generated Queries"
            total={queryHistory.filter(item => item.status === 'generated' || item.status === 'executed').length}
            data={getDailyStats(queryHistory).map(d => ({ date: d.date, value: d.generated }))}
            percentageChange={queryHistory.length > 1 ? (getDailyStats(queryHistory)[getDailyStats(queryHistory).length - 1].percentageRise ?? 0) : 0}
            dataKey="value"
            strokeColor="#8884d8"
            fillColor="#8884d8"
          />
          <MiniChartCard
            title="Total Executed Queries"
            total={queryHistory.filter(item => item.status === 'executed').length}
            data={getDailyStats(queryHistory).map(d => ({ date: d.date, value: d.executed }))}
            percentageChange={queryHistory.length > 1 ? (getDailyStats(queryHistory)[getDailyStats(queryHistory).length - 1].percentageRise ?? 0) : 0}
            dataKey="value"
            strokeColor="#82ca9d"
            fillColor="#82ca9d"
          />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Daily Query Activity</CardTitle>
            <CardDescription>Number of queries generated/executed per day.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartHistory data={getDailyStats(queryHistory)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Query History</CardTitle>
            <CardDescription>Review your past generated and executed SQL queries.</CardDescription>
          </CardHeader>
          <CardContent>
            {queryHistory.length === 0 ? (
              <p className="text-muted-foreground">No query history yet. Generate some SQL queries on the main page!</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
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
                    {queryHistory.map((historyItem) => (
                      <TableRow key={historyItem.id}>
                        <TableCell>{new Date(historyItem.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${historyItem.status === 'executed' ? 'bg-gray-700 text-white' : 'bg-gray-400 text-black'}`}>
                            {historyItem.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{historyItem.natural_language_query}</TableCell>
                        <TableCell className="font-mono text-xs">{historyItem.generated_sql}</TableCell>
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

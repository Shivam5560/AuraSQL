import { createClient } from '@/lib/supabase/client'

interface DbConfig {
  db_type: string
  ip: string
  port: number
  username: string
  password?: string
  database: string
  schema_name: string
}

interface MultiTableContextConfig extends DbConfig {
  table_names: string[]
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

interface ApiResponse<T = any> {
  success: boolean
  detail?: string
  data?: T
  schema?: ExtractedSchema
  recommendations?: string[]
  sql?: string
  explanation?: string
  source_tables?: string[]
  namespace_id?: string
  columns?: string[]
}

// Replace with your actual backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
 

export async function extractSchema(config: DbConfig & { table_name: string }): Promise<ApiResponse<ExtractedSchema>> {
  try {
    const response = await fetch(`${API_BASE_URL}/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error extracting schema:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function createMultiTableContext(config: MultiTableContextConfig): Promise<ApiResponse<{ namespace_id: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/create_multitable_context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating multi-table context:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function listTables(config: DbConfig): Promise<ApiResponse<{ table_names: string[] }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/list_tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        db_type: config.db_type,
        ip: config.ip,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        schema_name: config.schema_name,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error listing tables:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}


export async function getRecommendations(
  namespaceId: string
): Promise<ApiResponse<string[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        namespace_id: namespaceId,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting recommendations:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

interface GenerateQueryResponse {
  sql: string
  explanation: string
  source_tables: string[]
}

export async function generateQuery(
  namespaceId: string,
  naturalLanguageQuery: string
): Promise<ApiResponse<GenerateQueryResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        namespace_id: namespaceId,
        query: naturalLanguageQuery,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error generating query:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function executeQuery(
  config: DbConfig & { table_name: string },
  sql: string
): Promise<ApiResponse<Record<string, any>[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/query_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        db_type: config.db_type,
        ip: config.ip,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        schema_name: config.schema_name,
        table_name: config.table_name,
        query: sql,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error executing query:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function logGeneratedQuery(
  userId: string,
  naturalLanguageQuery: string,
  generatedSql: string
): Promise<ApiResponse<{ queryId: string }>> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('query_history')
      .insert([
        {
          user_id: userId,
          natural_language_query: naturalLanguageQuery,
          generated_sql: generatedSql,
          status: 'generated',
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Error logging generated query to Supabase:', error);
      return { success: false, detail: error.message };
    }

    return { success: true, queryId: data.id };
  } catch (error) {
    console.error('Unexpected error logging generated query:', error);
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function logExecutedQuery(
  queryId: string,
  userId: string,
  naturalLanguageQuery: string,
  generatedSql: string
): Promise<ApiResponse> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('query_history')
      .update({ status: 'executed' })
      .eq('id', queryId);

    if (error) {
      console.error('Error logging executed query to Supabase:', error);
      return { success: false, detail: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error logging executed query:', error);
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
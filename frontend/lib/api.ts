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

interface ApiResponse<T = any> {
  success: boolean
  detail?: string
  data?: T
  schema?: ExtractedSchema
  recommendations?: string[]
  sql?: string
}

// Replace with your actual backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function extractSchema(config: DbConfig): Promise<ApiResponse<ExtractedSchema>> {
  try {
    const response = await fetch(`${API_BASE_URL}/extract-schema`, {
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

export async function insertSchema(
  dbType: string,
  tableName: string,
  schemaName: string,
  schemaDetails: ExtractedSchema
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/insert-schema`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        db_type: dbType,
        table_name: tableName,
        schema_name: schemaName,
        schema_details: schemaDetails,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error inserting schema:', error)
    return {
      success: false,
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function getRecommendations(
  dbType: string,
  tableName: string,
  schemaName: string
): Promise<ApiResponse<string[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        db_type: dbType,
        table_name: tableName,
        schema_name: schemaName,
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

export async function generateQuery(
  dbType: string,
  tableName: string,
  schemaName: string,
  naturalLanguageQuery: string
): Promise<ApiResponse<string>> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        db_type: dbType,
        table_name: tableName,
        schema_name: schemaName,
        natural_language_query: naturalLanguageQuery,
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
  config: DbConfig,
  sql: string
): Promise<ApiResponse<Record<string, any>[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/execute-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...config,
        sql: sql,
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
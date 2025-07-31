export interface DbConfig {
  id: string
  name: string
  db_type: string
  ip: string
  port: number
  username: string
  password?: string
  database: string
  schema_name: string
}

export interface SchemaColumn {
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

export interface ExtractedSchema {
  [tableName: string]: SchemaColumn[]
}
import asyncpg
import aiomysql
import oracledb
import pandas as pd
import numpy as np

class ExtractSchema:
    def __init__(self, db_type, ip, port, username, password, database, schema_name, table_name):
        self.db_type = db_type.lower()
        self.ip = ip
        self.port = port
        self.username = username
        self.password = password
        self.database_schema = database
        self.schema_name = schema_name
        self.table_name = table_name

    async def connect_to_database(self):
        if self.db_type == "postgresql":
            return await asyncpg.connect(
                host=self.ip,
                port=self.port,
                user=self.username,
                password=self.password,
                database=self.database_schema
            )
        elif self.db_type == "mysql":
            return await aiomysql.connect(
                host=self.ip,
                port=self.port,
                user=self.username,
                password=self.password,
                db=self.database_schema
            )
        elif self.db_type == "oracle":
            dsn = f"{self.username}/{self.password}@{self.ip}:{self.port}/{self.database_schema}"
            return await oracledb.connect_async(dsn=dsn)
        else:
            raise ValueError(f"Unsupported database type: {self.db_type}")

    async def execute_query(self, query, params=None):
        conn = await self.connect_to_database()
        try:
            if self.db_type == "mysql":
                async with conn.cursor() as cursor:
                    await cursor.execute(query, params or ())
                    results = await cursor.fetchall()
                    columns = [desc[0] for desc in cursor.description]
            else:
                # asyncpg and oracledb have slightly different APIs
                if self.db_type == "postgresql":
                    results = await conn.fetch(query, *params)
                    columns = [field.name for field in results[0].keys()] if results else []
                elif self.db_type == "oracle":
                     async with conn.cursor() as cursor:
                        await cursor.execute(query, params or ())
                        results = await cursor.fetchall()
                        columns = [desc[0] for desc in cursor.description]
            
            df = pd.DataFrame(results, columns=columns)
            return df
        finally:
            if self.db_type in ["postgresql", "oracle"]:
                await conn.close()
            else: #aiomysql
                conn.close()

    async def extract_schema_details(self):
        query, params = self.get_schema_query()
        df = await self.execute_query(query, params)

        df['db_type'] = self.db_type
        df.replace({np.nan: None, np.inf: None, -np.inf: None}, inplace=True)

        return {self.table_name: df.to_dict(orient='records')}

    def get_schema_query(self):
        if self.db_type == 'postgresql':
            query = """ SELECT 
                        c.table_name,
                        c.column_name, 
                        c.data_type, 
                        c.is_nullable, 
                        c.character_maximum_length, 
                        c.numeric_precision, 
                        c.numeric_scale, 
                        tc.constraint_type, 
                        c.column_default
                    FROM 
                        information_schema.columns c
                    LEFT JOIN 
                        information_schema.key_column_usage kcu
                        ON c.table_name = kcu.table_name 
                        AND c.column_name = kcu.column_name 
                        AND c.table_schema = kcu.table_schema
                    LEFT JOIN 
                        information_schema.table_constraints tc
                        ON tc.constraint_name = kcu.constraint_name 
                        AND tc.table_schema = kcu.table_schema
                    WHERE 
                        c.table_name = $1
                        AND c.table_schema = $2
                    ORDER BY 
                        c.ordinal_position;"""
            params = (self.table_name, self.schema_name)
        elif self.db_type == 'mysql':
            query = """SELECT 
                COLUMN_NAME, 
                COLUMN_TYPE, 
                IS_NULLABLE, 
                COLUMN_DEFAULT, 
                EXTRA 
            FROM 
                information_schema.columns 
            WHERE 
                table_name = %s AND table_schema = %s;"""
            params = (self.table_name, self.database_schema)
        elif self.db_type == 'oracle':
            query = """SELECT 
                column_name, 
                data_type, 
                nullable, 
                data_default 
            FROM 
                all_tab_columns 
            WHERE 
                table_name = :1 AND owner = :2"""
            params = (self.table_name.upper(), self.database_schema.upper())
        else:
            raise ValueError(f"Unsupported database type: {self.db_type}")
        
        return query, params

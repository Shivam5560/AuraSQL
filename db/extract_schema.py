import psycopg2
import mysql.connector
import cx_Oracle
import pandas as pd
import numpy as np

class ExtractSchema:
    def __init__(self, db_type, ip, port, username, password, database,schema_name, table_name):
        self.db_type = db_type
        self.ip = ip
        self.port = port
        self.username = username
        self.password = password
        self.database_schema = database
        self.schema_name = schema_name
        self.table_name = table_name

    def connect_to_database(self):
        if self.db_type == "postgresql":
            return psycopg2.connect(
                host=self.ip,
                port=self.port,
                user=self.username,
                password=self.password,
                dbname=self.database_schema
            )
        elif self.db_type == "mysql":
            return mysql.connector.connect(
                host=self.ip,
                port=self.port,
                user=self.username,
                password=self.password,
                database=self.database_schema
            )
        elif self.db_type == "oracle":
            dsn = cx_Oracle.makedsn(self.ip, self.port, service_name=self.database_schema)
            return cx_Oracle.connect(
                user=self.username,
                password=self.password,
                dsn=dsn
            )
        else:
            raise ValueError(f"Unsupported database type: {self.db_type}")

    def extract_schema_details(self):
        try:
            connection = self.connect_to_database()
            cursor = connection.cursor()
            tables_details = {}
            if self.db_type == 'postgresql':
                query = f""" SELECT 
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
                            c.table_name = '{self.table_name}' 
                            AND c.table_schema = '{self.schema_name}'
                        ORDER BY 
                            c.ordinal_position;"""
                
            elif self.db_type == 'mysql':
                query = f"""SELECT 
                    COLUMN_NAME, 
                    COLUMN_TYPE, 
                    IS_NULLABLE, 
                    COLUMN_DEFAULT, 
                    EXTRA 
                FROM 
                    information_schema.columns 
                WHERE 
                    table_name = '{self.table_name}' AND table_schema = '{self.database_schema}';"""
                
            elif self.db_type == 'oracle':
                query = f"""SELECT 
                    column_name, 
                    data_type, 
                    nullable, 
                    data_default 
                FROM 
                    all_tab_columns 
                WHERE 
                    table_name = '{self.table_name.upper()}' AND owner = '{self.database_schema.upper()}';"""
                
            elif self.db_type == 'sqlite':
                query = f"""PRAGMA table_info({self.table_name});"""

            else:
                raise ValueError(f"Unsupported database type: {self.db_type}")
            
            cursor.execute(query)
            schema_details = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            df = pd.DataFrame(schema_details, columns=columns)
            # add db_type to the DataFrame
            df['db_type'] = self.db_type # but it has only one value, so it will be the same for all rows
            

            # Replace non-JSON-compliant values
            df.replace({np.nan: None, np.inf: None, -np.inf: None}, inplace=True)

            tables_details[self.table_name] = df.to_dict(orient='records')

            cursor.close()
            connection.close()
            return tables_details
        except Exception as e:
            raise Exception(f"Failed to extract schema: {str(e)}")
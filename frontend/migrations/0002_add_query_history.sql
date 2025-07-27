CREATE TABLE query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  natural_language_query TEXT NOT NULL,
  generated_sql TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual access" ON query_history FOR ALL
USING (auth.uid() = user_id);

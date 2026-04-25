CREATE TABLE IF NOT EXISTS notices (
  id         BIGSERIAL   PRIMARY KEY,
  content    TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notices_select_all"
  ON notices FOR SELECT TO authenticated USING (true);

CREATE POLICY "notices_insert_pastor"
  ON notices FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  );

CREATE POLICY "notices_update_pastor"
  ON notices FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  );

CREATE POLICY "notices_delete_pastor"
  ON notices FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  );

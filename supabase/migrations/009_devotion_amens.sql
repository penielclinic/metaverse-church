-- ============================================================
-- 009_devotion_amens.sql
-- 큐티 아멘 테이블 + 아바타 큐티 스트릭 컬럼
-- ============================================================

-- ── 큐티 아멘 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devotion_amens (
  devotion_id  BIGINT  NOT NULL REFERENCES devotion_logs(id) ON DELETE CASCADE,
  user_id      UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (devotion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_devotion_amens_devotion
  ON devotion_amens(devotion_id);

-- ── 아바타 큐티 스트릭 컬럼 추가 ─────────────────────────────
ALTER TABLE avatars
  ADD COLUMN IF NOT EXISTS devotion_streak    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_devotion_date DATE;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE devotion_amens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devotion_amens_select_all"
  ON devotion_amens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "devotion_amens_insert_own"
  ON devotion_amens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "devotion_amens_delete_own"
  ON devotion_amens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 012_cell_notice.sql
-- 셀 공지사항 + 셀 일정 테이블
-- ============================================================

-- ── 셀 공지사항 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cell_notices (
  id          BIGSERIAL   PRIMARY KEY,
  cell_id     INTEGER     NOT NULL REFERENCES cells(id)    ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL CHECK (char_length(title)   BETWEEN 1 AND 80),
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  is_pinned   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cell_notices_cell_created
  ON cell_notices(cell_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cell_notices_cell_pinned
  ON cell_notices(cell_id, is_pinned DESC, created_at DESC);

-- ── 셀 일정 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cell_schedules (
  id           BIGSERIAL   PRIMARY KEY,
  cell_id      INTEGER     NOT NULL REFERENCES cells(id)    ON DELETE CASCADE,
  title        TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  scheduled_at TIMESTAMPTZ NOT NULL,
  location     TEXT        CHECK (char_length(location) <= 80),
  description  TEXT        CHECK (char_length(description) <= 300),
  type         TEXT        NOT NULL DEFAULT 'regular'
                           CHECK (type IN ('regular', 'special')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cell_schedules_cell_date
  ON cell_schedules(cell_id, scheduled_at ASC);

-- ── RLS 활성화 ───────────────────────────────────────────────
ALTER TABLE cell_notices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_schedules ENABLE ROW LEVEL SECURITY;

-- ── cell_notices RLS 정책 ─────────────────────────────────────

-- 조회: 소속 셀원 + pastor / youth_pastor / mission_leader
CREATE POLICY "cell_notices_select"
  ON cell_notices FOR SELECT TO authenticated
  USING (
    -- 소속 셀
    cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    OR
    -- 교역자·선교회장 전체 조회
    (SELECT role FROM profiles WHERE id = auth.uid())
      IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- 작성: 해당 셀의 cell_leader + 교역자
CREATE POLICY "cell_notices_insert"
  ON cell_notices FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      -- 자신의 셀 공지만 작성 가능 (cell_leader)
      (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'cell_leader'
        AND cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
      )
      OR
      -- 교역자·선교회장은 모든 셀 가능
      (SELECT role FROM profiles WHERE id = auth.uid())
        IN ('pastor', 'youth_pastor', 'mission_leader')
    )
  );

-- 삭제: 작성자 본인 또는 교역자
CREATE POLICY "cell_notices_delete"
  ON cell_notices FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid())
      IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- ── cell_schedules RLS 정책 ───────────────────────────────────

-- 조회: 소속 셀원 + 교역자
CREATE POLICY "cell_schedules_select"
  ON cell_schedules FOR SELECT TO authenticated
  USING (
    cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    OR
    (SELECT role FROM profiles WHERE id = auth.uid())
      IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- 작성: cell_leader (자신의 셀) + 교역자
CREATE POLICY "cell_schedules_insert"
  ON cell_schedules FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'cell_leader'
      AND cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    )
    OR
    (SELECT role FROM profiles WHERE id = auth.uid())
      IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- 삭제: cell_leader (자신의 셀) + 교역자
CREATE POLICY "cell_schedules_delete"
  ON cell_schedules FOR DELETE TO authenticated
  USING (
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'cell_leader'
      AND cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    )
    OR
    (SELECT role FROM profiles WHERE id = auth.uid())
      IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- ── Realtime Publication ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cell_notices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cell_notices;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cell_schedules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cell_schedules;
  END IF;
END $$;

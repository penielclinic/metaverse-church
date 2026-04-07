-- ============================================================
-- 003_cells.sql
-- 셀(순) 테이블 + 선교회 테이블
-- profiles.cell_id / profiles.mission_id FK 후속 추가
-- ============================================================

-- ── 선교회 (missions) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL,
  leader_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 셀/순 (cells) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cells (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL,
  leader_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  mission_id  INTEGER     REFERENCES missions(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── profiles에 FK 컬럼 추가 ──────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cell_id    INTEGER REFERENCES cells(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_id INTEGER REFERENCES missions(id) ON DELETE SET NULL;

-- ── 인덱스 ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cells_mission_id    ON cells(mission_id);
CREATE INDEX IF NOT EXISTS idx_profiles_cell_id    ON profiles(cell_id);
CREATE INDEX IF NOT EXISTS idx_profiles_mission_id ON profiles(mission_id);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells    ENABLE ROW LEVEL SECURITY;

-- 전체 조회 가능
CREATE POLICY "missions_select_all"
  ON missions FOR SELECT TO authenticated USING (true);

CREATE POLICY "cells_select_all"
  ON cells FOR SELECT TO authenticated USING (true);

-- 수정·생성은 youth_pastor / pastor만
CREATE POLICY "missions_modify_leaders"
  ON missions FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('youth_pastor', 'pastor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('youth_pastor', 'pastor')
  );

CREATE POLICY "cells_modify_leaders"
  ON cells FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('cell_leader', 'youth_pastor', 'pastor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('cell_leader', 'youth_pastor', 'pastor')
  );

-- ============================================================
-- 010_attendance.sql
-- 출석 로그 테이블 + RLS
-- ============================================================

-- ── attendance_logs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_logs (
  id        BIGSERIAL   PRIMARY KEY,
  cell_id   INTEGER     NOT NULL REFERENCES cells(id)    ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date      DATE        NOT NULL,
  status    TEXT        NOT NULL
              CHECK (status IN ('present', 'absent', 'late')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 날짜·셀·유저 조합은 한 번만
  CONSTRAINT attendance_logs_unique UNIQUE (cell_id, user_id, date)
);

-- ── profiles.attendance_total 컬럼 추가 (순보고 연동) ─────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS attendance_total INTEGER NOT NULL DEFAULT 0;

-- ── 인덱스 ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_cell_date
  ON attendance_logs(cell_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_user
  ON attendance_logs(user_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: 해당 셀 멤버 + 목사·청년담당자
CREATE POLICY "attendance_select_cell_members"
  ON attendance_logs FOR SELECT TO authenticated
  USING (
    cell_id IN (
      SELECT cell_id FROM profiles WHERE id = auth.uid() AND cell_id IS NOT NULL
    )
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  );

-- INSERT / UPDATE: 해당 셀 순장 + 목사·청년담당자
CREATE POLICY "attendance_write_cell_leader"
  ON attendance_logs FOR INSERT TO authenticated
  WITH CHECK (
    (
      -- 요청 셀의 순장인지 확인
      cell_id IN (
        SELECT id FROM cells WHERE leader_id = auth.uid()
      )
    )
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  );

CREATE POLICY "attendance_update_cell_leader"
  ON attendance_logs FOR UPDATE TO authenticated
  USING (
    cell_id IN (
      SELECT id FROM cells WHERE leader_id = auth.uid()
    )
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  )
  WITH CHECK (
    cell_id IN (
      SELECT id FROM cells WHERE leader_id = auth.uid()
    )
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  );

-- DELETE: 목사만 허용
CREATE POLICY "attendance_delete_pastor"
  ON attendance_logs FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  );

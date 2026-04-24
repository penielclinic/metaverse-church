-- ============================================================
-- 015_cell_join_requests.sql
-- 순 배치 신청 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS cell_join_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cell_id     INTEGER     NOT NULL REFERENCES cells(id)    ON DELETE CASCADE,
  message     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cell_join_requests_cell_id
  ON cell_join_requests(cell_id, status);

CREATE INDEX IF NOT EXISTS idx_cell_join_requests_user_id
  ON cell_join_requests(user_id, status);

ALTER TABLE cell_join_requests ENABLE ROW LEVEL SECURITY;

-- 본인 신청 등록
CREATE POLICY "join_requests_insert_own"
  ON cell_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 본인 신청 조회 + 해당 셀 순장 + 목사/교역자
CREATE POLICY "join_requests_select"
  ON cell_join_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
    OR cell_id IN (SELECT id FROM cells WHERE leader_id = auth.uid())
  );

-- 순장/목사가 승인·거절
CREATE POLICY "join_requests_update_leaders"
  ON cell_join_requests FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
    OR cell_id IN (SELECT id FROM cells WHERE leader_id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
    OR cell_id IN (SELECT id FROM cells WHERE leader_id = auth.uid())
  );

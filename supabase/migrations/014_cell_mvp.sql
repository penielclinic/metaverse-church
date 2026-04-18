-- ============================================================
-- 014_cell_mvp.sql
-- 셀 MVP 투표 — mvp_sessions, mvp_votes 테이블
-- profiles에 왕관 컬럼 추가
-- ============================================================

-- ── profiles 왕관 컬럼 추가 ───────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_crown   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS crown_until TIMESTAMPTZ;

-- ── MVP 투표 세션 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mvp_sessions (
  id          BIGSERIAL   PRIMARY KEY,
  cell_id     INTEGER     NOT NULL REFERENCES cells(id)    ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'closed')),
  winner_ids  UUID[]      NOT NULL DEFAULT '{}',
  created_by  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mvp_sessions_cell_status
  ON mvp_sessions(cell_id, status, created_at DESC);

-- ── MVP 개별 투표 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mvp_votes (
  id          BIGSERIAL   PRIMARY KEY,
  session_id  BIGINT      NOT NULL REFERENCES mvp_sessions(id) ON DELETE CASCADE,
  voter_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, voter_id)   -- 세션당 1인 1표
);

CREATE INDEX IF NOT EXISTS idx_mvp_votes_session
  ON mvp_votes(session_id);

-- ── RLS 활성화 ───────────────────────────────────────────────
ALTER TABLE mvp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvp_votes    ENABLE ROW LEVEL SECURITY;

-- ── mvp_sessions RLS ─────────────────────────────────────────

-- 조회: 소속 셀원 + 교역자
CREATE POLICY "mvp_sessions_select"
  ON mvp_sessions FOR SELECT TO authenticated
  USING (
    cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid())
         IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- 생성: cell_leader (자신의 셀) + 교역자
CREATE POLICY "mvp_sessions_insert"
  ON mvp_sessions FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'cell_leader'
        AND cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
      )
      OR (SELECT role FROM profiles WHERE id = auth.uid())
           IN ('pastor', 'youth_pastor')
    )
  );

-- 수정(종료): cell_leader + 교역자
CREATE POLICY "mvp_sessions_update"
  ON mvp_sessions FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
      IN ('cell_leader', 'pastor', 'youth_pastor')
  );

-- ── mvp_votes RLS ─────────────────────────────────────────────

-- 조회: 소속 셀원 + 교역자
CREATE POLICY "mvp_votes_select"
  ON mvp_votes FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT id FROM mvp_sessions
      WHERE cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid())
         IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- 투표: 인증된 사용자 (API에서 세션 유효성 검증)
CREATE POLICY "mvp_votes_insert"
  ON mvp_votes FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid());

-- ── Realtime Publication ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'mvp_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mvp_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'mvp_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mvp_votes;
  END IF;
END $$;

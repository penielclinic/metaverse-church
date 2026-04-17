-- ============================================================
-- 011_cell_word_prayer.sql
-- 순 모임방 - 오늘의 말씀 보드 + 기도제목 테이블
-- ============================================================

-- ── 오늘의 말씀 보드 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cell_word_boards (
  id          BIGSERIAL   PRIMARY KEY,
  cell_id     INTEGER     NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  bible_ref   TEXT        NOT NULL DEFAULT '' CHECK (char_length(bible_ref) <= 100),
  bible_text  TEXT        NOT NULL DEFAULT '' CHECK (char_length(bible_text) <= 1000),
  questions   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- questions 구조: [{ "id": 1, "text": "질문 내용" }, ...]
  updated_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cell_id)  -- 셀당 하나의 말씀 보드
);

CREATE INDEX IF NOT EXISTS idx_cell_word_boards_cell_id
  ON cell_word_boards(cell_id);

-- ── 기도제목 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cell_prayer_requests (
  id          BIGSERIAL   PRIMARY KEY,
  cell_id     INTEGER     NOT NULL REFERENCES cells(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
  color       TEXT        NOT NULL DEFAULT 'yellow'
                          CHECK (color IN ('yellow', 'blue', 'green', 'pink')),
  amen_count  INTEGER     NOT NULL DEFAULT 0 CHECK (amen_count >= 0),
  is_answered BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cell_prayer_requests_cell_id
  ON cell_prayer_requests(cell_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cell_prayer_requests_user_id
  ON cell_prayer_requests(user_id);

-- 아멘 중복 방지 테이블
CREATE TABLE IF NOT EXISTS cell_prayer_amens (
  id          BIGSERIAL   PRIMARY KEY,
  request_id  BIGINT      NOT NULL REFERENCES cell_prayer_requests(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, user_id)
);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER trg_cell_word_boards_updated_at
  BEFORE UPDATE ON cell_word_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cell_prayer_requests_updated_at
  BEFORE UPDATE ON cell_prayer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE cell_word_boards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_prayer_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_prayer_amens     ENABLE ROW LEVEL SECURITY;

-- 셀 멤버 여부 확인 헬퍼 함수
CREATE OR REPLACE FUNCTION is_cell_member(p_cell_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (
        cell_id = p_cell_id
        OR role IN ('youth_pastor', 'pastor')
      )
  );
$$;

-- 셀 순장 여부 확인
CREATE OR REPLACE FUNCTION is_cell_leader(p_cell_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN cells c ON c.id = p_cell_id
    WHERE p.id = auth.uid()
      AND (
        c.leader_id = auth.uid()
        OR p.role IN ('youth_pastor', 'pastor')
      )
  );
$$;

-- ── cell_word_boards RLS ─────────────────────────────────────
-- 조회: 해당 셀 멤버만
CREATE POLICY "cell_word_boards_select"
  ON cell_word_boards FOR SELECT TO authenticated
  USING (is_cell_member(cell_id));

-- 삽입/수정: 순장 또는 pastor만
CREATE POLICY "cell_word_boards_insert"
  ON cell_word_boards FOR INSERT TO authenticated
  WITH CHECK (is_cell_leader(cell_id));

CREATE POLICY "cell_word_boards_update"
  ON cell_word_boards FOR UPDATE TO authenticated
  USING (is_cell_leader(cell_id))
  WITH CHECK (is_cell_leader(cell_id));

-- ── cell_prayer_requests RLS ─────────────────────────────────
-- 조회: 해당 셀 멤버만
CREATE POLICY "cell_prayer_requests_select"
  ON cell_prayer_requests FOR SELECT TO authenticated
  USING (is_cell_member(cell_id));

-- 삽입: 셀 멤버 본인
CREATE POLICY "cell_prayer_requests_insert"
  ON cell_prayer_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_cell_member(cell_id)
  );

-- 수정: 본인만 (아멘 카운트는 서버사이드에서 업데이트)
CREATE POLICY "cell_prayer_requests_update_own"
  ON cell_prayer_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 삭제: 본인 또는 순장/pastor
CREATE POLICY "cell_prayer_requests_delete"
  ON cell_prayer_requests FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR is_cell_leader(cell_id)
  );

-- ── cell_prayer_amens RLS ────────────────────────────────────
CREATE POLICY "cell_prayer_amens_select"
  ON cell_prayer_amens FOR SELECT TO authenticated USING (true);

CREATE POLICY "cell_prayer_amens_insert"
  ON cell_prayer_amens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cell_prayer_amens_delete_own"
  ON cell_prayer_amens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── 아멘 카운트 원자적 증감 RPC ─────────────────────────────
CREATE OR REPLACE FUNCTION increment_prayer_amen(p_request_id BIGINT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE cell_prayer_requests
  SET amen_count = amen_count + 1
  WHERE id = p_request_id;
$$;

CREATE OR REPLACE FUNCTION decrement_prayer_amen(p_request_id BIGINT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE cell_prayer_requests
  SET amen_count = GREATEST(0, amen_count - 1)
  WHERE id = p_request_id;
$$;

-- ── Supabase Realtime 활성화 ─────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cell_word_boards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cell_word_boards;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cell_prayer_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cell_prayer_requests;
  END IF;
END $$;

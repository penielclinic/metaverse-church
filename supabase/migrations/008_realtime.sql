-- ============================================================
-- 008_realtime.sql
-- Supabase Realtime 활성화 + chat_messages + presence_log
-- ============================================================

-- ── 채팅 메시지 테이블 ───────────────────────────────────────
-- (spaces 테이블은 별도 마이그레이션 없이 여기서 함께 생성)
CREATE TABLE IF NOT EXISTS spaces (
  id          SERIAL      PRIMARY KEY,
  slug        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL
                          CHECK (type IN ('sanctuary','plaza','cell','prayer','library','scholarship')),
  capacity    INTEGER     NOT NULL DEFAULT 50,
  cell_id     INTEGER     REFERENCES cells(id) ON DELETE SET NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 기본 공간 시드
INSERT INTO spaces (slug, name, type, capacity) VALUES
  ('sanctuary', '본당',       'sanctuary', 200),
  ('plaza',     '교제광장',   'plaza',     100),
  ('prayer',    '기도실',     'prayer',     30),
  ('library',   '설교 도서관','library',    50),
  ('scholarship','장학관',    'scholarship', 20)
ON CONFLICT (slug) DO NOTHING;

-- ── 채팅 메시지 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id    INTEGER     NOT NULL REFERENCES spaces(id)   ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  type        TEXT        NOT NULL DEFAULT 'text'
                          CHECK (type IN ('text', 'emoji', 'system')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_space_created
  ON chat_messages(space_id, created_at DESC);

-- ── Presence 로그 (Realtime Presence 보조) ───────────────────
CREATE TABLE IF NOT EXISTS presence_log (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id    INTEGER     NOT NULL REFERENCES spaces(id)   ON DELETE CASCADE,
  pos_x       FLOAT       NOT NULL DEFAULT 0,
  pos_z       FLOAT       NOT NULL DEFAULT 0,
  entered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_log_space_user
  ON presence_log(space_id, user_id);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE spaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_log  ENABLE ROW LEVEL SECURITY;

-- spaces: 전체 조회
CREATE POLICY "spaces_select_all"
  ON spaces FOR SELECT TO authenticated USING (true);

-- spaces: pastor/youth_pastor만 관리
CREATE POLICY "spaces_manage_leaders"
  ON spaces FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('youth_pastor', 'pastor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('youth_pastor', 'pastor')
  );

-- chat_messages: 공개 공간은 전체, 셀 모임방은 셀원만
CREATE POLICY "chat_messages_select"
  ON chat_messages FOR SELECT TO authenticated
  USING (
    -- 공개 공간 (cell_id 없는 공간)
    (SELECT cell_id FROM spaces WHERE id = space_id) IS NULL
    OR
    -- 셀 모임방: 소속 셀원만
    space_id IN (
      SELECT s.id FROM spaces s
      JOIN cells c ON s.cell_id = c.id
      JOIN profiles p ON p.cell_id = c.id
      WHERE p.id = auth.uid()
    )
    OR
    -- pastor / youth_pastor 전체 접근
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
  );

CREATE POLICY "chat_messages_insert_own"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (SELECT cell_id FROM spaces WHERE id = space_id) IS NULL
      OR space_id IN (
        SELECT s.id FROM spaces s
        JOIN cells c ON s.cell_id = c.id
        JOIN profiles p ON p.cell_id = c.id
        WHERE p.id = auth.uid()
      )
      OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
    )
  );

-- presence_log: 전체 조회(위치 렌더링), 본인만 삽입
CREATE POLICY "presence_log_select_all"
  ON presence_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "presence_log_insert_own"
  ON presence_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── Supabase Realtime Publication 활성화 ─────────────────────
-- Supabase 대시보드 또는 CLI에서 활성화:
--   supabase realtime enable prayer_notes
--   supabase realtime enable chat_messages
--
-- 아래는 PostgreSQL publication 직접 설정 (supabase_realtime publication이 존재할 경우)

DO $$
BEGIN
  -- prayer_notes Realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'prayer_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prayer_notes;
  END IF;

  -- chat_messages Realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;

  -- presence_log Realtime (아바타 위치 동기화)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'presence_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE presence_log;
  END IF;
END $$;

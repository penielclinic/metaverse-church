-- ============================================================
-- Supabase SQL Editor에 그대로 붙여넣고 Run 하세요
-- 013_cell_album + 014_cell_mvp 통합본
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- [1] 셀 앨범 (cell_album 테이블 + Storage 버킷)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cell_album (
  id           BIGSERIAL   PRIMARY KEY,
  cell_id      INTEGER     NOT NULL REFERENCES cells(id)    ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,
  public_url   TEXT        NOT NULL,
  file_name    TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cell_album_cell_created
  ON cell_album(cell_id, created_at DESC);

ALTER TABLE cell_album ENABLE ROW LEVEL SECURITY;

-- 조회: 소속 셀원 + 교역자
CREATE POLICY "cell_album_select"
  ON cell_album FOR SELECT TO authenticated
  USING (
    cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid())
         IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- 업로드: 소속 셀원 + 교역자
CREATE POLICY "cell_album_insert"
  ON cell_album FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
      OR (SELECT role FROM profiles WHERE id = auth.uid())
           IN ('pastor', 'youth_pastor', 'mission_leader')
    )
  );

-- 삭제: 본인 + cell_leader(자신의 셀) + 교역자
CREATE POLICY "cell_album_delete"
  ON cell_album FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'cell_leader'
      AND cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid())
         IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- Storage 버킷 생성 (이미 있으면 무시)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cell-album',
  'cell-album',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "cell_album_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cell-album');

CREATE POLICY "cell_album_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cell-album');

CREATE POLICY "cell_album_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cell-album');

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cell_album'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cell_album;
  END IF;
END $$;


-- ══════════════════════════════════════════════════════════════
-- [2] 셀 MVP 투표 (mvp_sessions + mvp_votes + profiles 컬럼)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_crown   BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS crown_until TIMESTAMPTZ;

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

CREATE TABLE IF NOT EXISTS mvp_votes (
  id          BIGSERIAL   PRIMARY KEY,
  session_id  BIGINT      NOT NULL REFERENCES mvp_sessions(id) ON DELETE CASCADE,
  voter_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_mvp_votes_session
  ON mvp_votes(session_id);

ALTER TABLE mvp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvp_votes    ENABLE ROW LEVEL SECURITY;

-- mvp_sessions RLS
CREATE POLICY "mvp_sessions_select"
  ON mvp_sessions FOR SELECT TO authenticated
  USING (
    cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid())
         IN ('pastor', 'youth_pastor', 'mission_leader')
  );

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

CREATE POLICY "mvp_sessions_update"
  ON mvp_sessions FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
      IN ('cell_leader', 'pastor', 'youth_pastor')
  );

-- mvp_votes RLS
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

CREATE POLICY "mvp_votes_insert"
  ON mvp_votes FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid());

-- Realtime
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

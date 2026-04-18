-- ============================================================
-- 013_cell_album.sql
-- 셀 앨범 테이블 + Storage 버킷 설정
-- ============================================================

-- ── cell_album 테이블 ─────────────────────────────────────────
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

-- ── RLS 활성화 ───────────────────────────────────────────────
ALTER TABLE cell_album ENABLE ROW LEVEL SECURITY;

-- 조회: 소속 셀원 + 교역자
CREATE POLICY "cell_album_select"
  ON cell_album FOR SELECT TO authenticated
  USING (
    cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    OR
    (SELECT role FROM profiles WHERE id = auth.uid())
      IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- 업로드: 소속 셀원 + 교역자
CREATE POLICY "cell_album_insert"
  ON cell_album FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
      OR
      (SELECT role FROM profiles WHERE id = auth.uid())
        IN ('pastor', 'youth_pastor', 'mission_leader')
    )
  );

-- 삭제: 업로드 본인 + cell_leader(자신의 셀) + 교역자
CREATE POLICY "cell_album_delete"
  ON cell_album FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'cell_leader'
      AND cell_id = (SELECT cell_id FROM profiles WHERE id = auth.uid())
    )
    OR
    (SELECT role FROM profiles WHERE id = auth.uid())
      IN ('pastor', 'youth_pastor', 'mission_leader')
  );

-- ── Storage 버킷 생성 ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cell-album',
  'cell-album',
  TRUE,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS 정책 ──────────────────────────────────────────

-- 조회(다운로드): 인증된 사용자 전체 허용 (public 버킷이므로)
CREATE POLICY "cell_album_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cell-album');

-- 업로드: 인증된 사용자 (API route에서 셀 멤버 검증)
CREATE POLICY "cell_album_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cell-album');

-- 삭제: 인증된 사용자 (API route에서 권한 검증)
CREATE POLICY "cell_album_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cell-album');

-- ── Realtime Publication ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cell_album'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cell_album;
  END IF;
END $$;

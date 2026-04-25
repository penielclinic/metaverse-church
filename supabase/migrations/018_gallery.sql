-- ============================================================
-- 018_gallery.sql
-- 갤러리 — 교회 사진·행사 추억을 함께 봐요
-- ============================================================

CREATE TABLE gallery_photos (
  id           BIGSERIAL   PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  tag          TEXT        NOT NULL CHECK (tag IN ('worship', 'event', 'mission', 'youth', 'daily')),
  storage_path TEXT        NOT NULL,
  public_url   TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_photos_tag_created
  ON gallery_photos(tag, created_at DESC);

ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

-- 조회: 로그인한 성도 누구나
CREATE POLICY "gallery_photos_select"
  ON gallery_photos FOR SELECT TO authenticated
  USING (true);

-- 업로드: 본인
CREATE POLICY "gallery_photos_insert"
  ON gallery_photos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 삭제: 업로드 본인 + pastor
CREATE POLICY "gallery_photos_delete"
  ON gallery_photos FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'pastor'
  );

-- ── Storage 버킷 ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery',
  'gallery',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "gallery_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gallery');

CREATE POLICY "gallery_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "gallery_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gallery');

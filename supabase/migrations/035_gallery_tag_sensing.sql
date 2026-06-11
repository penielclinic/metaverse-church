-- ============================================================
-- 035_gallery_tag_sensing.sql
-- gallery_photos.tag CHECK 제약에 'sensing'(센싱키즈카페) 추가
-- ============================================================

ALTER TABLE gallery_photos
  DROP CONSTRAINT IF EXISTS gallery_photos_tag_check;

ALTER TABLE gallery_photos
  ADD CONSTRAINT gallery_photos_tag_check
  CHECK (tag IN ('worship', 'event', 'mission', 'youth', 'daily', 'sensing'));

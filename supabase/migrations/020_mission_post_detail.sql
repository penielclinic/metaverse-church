-- 선교 활동 소식 상세 필드 추가
ALTER TABLE mission_posts
  ADD COLUMN IF NOT EXISTS activity_date      DATE,
  ADD COLUMN IF NOT EXISTS location           TEXT,
  ADD COLUMN IF NOT EXISTS participant_count  INTEGER,
  ADD COLUMN IF NOT EXISTS activity_type      TEXT CHECK (activity_type IN ('전도','봉사','예배','친교','기타'));

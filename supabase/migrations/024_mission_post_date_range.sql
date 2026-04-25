-- 활동 날짜를 시작일~종료일 범위로 변경
ALTER TABLE mission_posts
  ADD COLUMN IF NOT EXISTS activity_date_from DATE,
  ADD COLUMN IF NOT EXISTS activity_date_to   DATE;

-- 기존 activity_date 값 마이그레이션
UPDATE mission_posts
  SET activity_date_from = activity_date,
      activity_date_to   = activity_date
  WHERE activity_date IS NOT NULL;

ALTER TABLE mission_posts DROP COLUMN IF EXISTS activity_date;

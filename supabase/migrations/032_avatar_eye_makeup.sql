-- 032_avatar_accessories.sql
-- 아바타 악세서리 컬럼 추가

ALTER TABLE avatars ADD COLUMN IF NOT EXISTS eye_makeup TEXT DEFAULT 'none';  -- 여성 전용 눈화장
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS glasses    TEXT DEFAULT 'none';  -- 공용 안경/선글라스
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS earring    TEXT DEFAULT 'none';  -- 여성 전용 귀걸이
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS necklace   TEXT DEFAULT 'none';  -- 여성 전용 목걸이

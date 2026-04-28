-- 031_avatar_exp.sql
-- avatars 테이블에 exp, exp_to_next 컬럼 추가

ALTER TABLE avatars ADD COLUMN IF NOT EXISTS exp         INTEGER DEFAULT 0;
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS exp_to_next INTEGER DEFAULT 100;

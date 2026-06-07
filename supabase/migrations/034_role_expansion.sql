-- ============================================================
-- 034_role_expansion.sql
-- 역할 CHECK 제약 확장
-- 추가: elder, young_children, elementary, middle_school,
--       high_school, pastor_wife, associate_pastor
-- ============================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    -- 목회
    'pastor',           -- 담임목사
    'associate_pastor', -- 부목사님
    'pastor_wife',      -- 목사님사모
    'school_pastor',    -- 교회학교 목사
    -- 장로/직분
    'elder',            -- 장로
    -- 선교회/부서 리더
    'mission_leader',   -- 선교회장
    'youth_pastor',     -- 교역자(청년부)
    'youth_leader',     -- 청년회장
    'youth_vice_leader',-- 청년부회장
    'youth_secretary',  -- 청년부총무
    'school_teacher',   -- 교회학교 교사
    'cell_leader',      -- 순장
    -- 부서별 성도
    'young_children',   -- 유년부
    'elementary',       -- 초등부
    'middle_school',    -- 중등부
    'high_school',      -- 고등부
    -- 일반
    'youth',            -- 청년
    'member'            -- 일반 성도
  ));

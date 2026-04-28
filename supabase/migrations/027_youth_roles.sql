-- ============================================================
-- 027_youth_roles.sql
-- 청년 임원 직분 추가 + 임원모임방 셀 추가
-- 새 역할: youth_leader(청년회장), youth_vice_leader(청년부회장), youth_secretary(청년부총무)
-- ============================================================

-- 1. profiles.role CHECK 제약 확장
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'pastor',
    'school_pastor',
    'mission_leader',
    'youth_pastor',
    'youth_leader',
    'youth_vice_leader',
    'youth_secretary',
    'school_teacher',
    'cell_leader',
    'youth',
    'member'
  ));

-- 2. 임원모임방 셀 추가 (청년회 mission에 연결, 없으면 NULL)
INSERT INTO cells (name, mission_id)
SELECT '임원모임방', id
FROM missions
WHERE name = '청년회'
ORDER BY id
LIMIT 1
ON CONFLICT DO NOTHING;

-- 청년회 mission이 없을 경우 mission_id 없이 삽입
INSERT INTO cells (name, mission_id)
SELECT '임원모임방', NULL
WHERE NOT EXISTS (SELECT 1 FROM cells WHERE name = '임원모임방')
ON CONFLICT DO NOTHING;

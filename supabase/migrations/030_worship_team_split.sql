-- 030_worship_team_split.sql
-- 찬양팀 모임방을 찬양팀1, 찬양팀2 두 개로 분리

-- 기존 '찬양팀 모임방' → '찬양팀1' 이름 변경
UPDATE cells
SET name = '찬양팀1'
WHERE name = '찬양팀 모임방'
  AND mission_id = (SELECT id FROM missions WHERE name = '찬양팀');

-- '찬양팀2' 추가 (없으면)
INSERT INTO cells (name, mission_id)
SELECT '찬양팀2', id FROM missions WHERE name = '찬양팀'
AND NOT EXISTS (
  SELECT 1 FROM cells
  WHERE name = '찬양팀2'
    AND mission_id = (SELECT id FROM missions WHERE name = '찬양팀')
);

-- 028_worship_team.sql
-- 찬양팀 선교회 및 소그룹 모임방 추가

-- 1. 찬양팀 선교회 추가 (없으면)
INSERT INTO missions (name)
SELECT '찬양팀'
WHERE NOT EXISTS (SELECT 1 FROM missions WHERE name = '찬양팀');

-- 2. 찬양팀 모임방 셀 추가 (찬양팀1, 찬양팀2)
INSERT INTO cells (name, mission_id)
SELECT '찬양팀1', id FROM missions WHERE name = '찬양팀'
WHERE NOT EXISTS (SELECT 1 FROM cells WHERE name = '찬양팀1');

INSERT INTO cells (name, mission_id)
SELECT '찬양팀2', id FROM missions WHERE name = '찬양팀'
WHERE NOT EXISTS (SELECT 1 FROM cells WHERE name = '찬양팀2');

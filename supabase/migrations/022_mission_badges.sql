-- 선교 참여 배지 정의 추가
INSERT INTO badge_definitions (slug, name, description, icon_url, rarity) VALUES
  ('mission_spark',     '✨ 선교불꽃',   '선교 활동에 처음 참여했습니다',            NULL, 'common'),
  ('mission_helper',    '🌿 선교새싹',   '선교 활동에 3회 참여했습니다',             NULL, 'common'),
  ('mission_walker',    '🕊️ 평화의사자', '선교 활동에 7회 참여했습니다',             NULL, 'rare'),
  ('mission_runner',    '🔥 선교용사',   '선교 활동에 15회 참여했습니다',            NULL, 'rare'),
  ('mission_champion',  '🌟 선교챔피언', '선교 활동에 30회 참여했습니다',            NULL, 'epic'),
  ('mission_legend',    '👑 선교전설',   '선교 활동에 50회 참여하며 헌신을 다했습니다', NULL, 'legendary')
ON CONFLICT (slug) DO NOTHING;

-- 선교 참여 총 횟수를 세어 배지 자동 수여하는 함수
CREATE OR REPLACE FUNCTION check_mission_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_count INTEGER;
  v_badge_id INTEGER;
  v_slug TEXT;
  v_milestones TEXT[] := ARRAY['mission_spark','mission_helper','mission_walker','mission_runner','mission_champion','mission_legend'];
  v_thresholds INTEGER[] := ARRAY[1, 2, 3, 4, 5, 6];
  i INTEGER;
BEGIN
  -- 해당 유저의 총 선교 참여 수
  SELECT COUNT(*) INTO v_count
  FROM mission_participations
  WHERE user_id = p_user_id;

  -- 각 마일스톤 체크
  FOR i IN 1..array_length(v_milestones, 1) LOOP
    IF v_count >= v_thresholds[i] THEN
      v_slug := v_milestones[i];
      SELECT id INTO v_badge_id FROM badge_definitions WHERE slug = v_slug;
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO user_badges (user_id, badge_id)
          VALUES (p_user_id, v_badge_id)
          ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 참여 INSERT 트리거에 배지 체크 추가
CREATE OR REPLACE FUNCTION handle_mission_participation_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mission_posts
    SET participation_count = participation_count + 1
  WHERE id = NEW.post_id;

  INSERT INTO avatars (user_id, exp)
    VALUES (NEW.user_id, 30)
    ON CONFLICT (user_id)
    DO UPDATE SET exp = avatars.exp + 30, updated_at = NOW();

  PERFORM check_mission_badges(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

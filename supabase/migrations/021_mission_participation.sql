-- 선교 활동 참여 테이블
CREATE TABLE IF NOT EXISTS mission_participations (
  post_id  BIGINT NOT NULL REFERENCES mission_posts(id) ON DELETE CASCADE,
  user_id  UUID   NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE mission_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mission_participations_select_all"
  ON mission_participations FOR SELECT TO authenticated USING (true);

CREATE POLICY "mission_participations_insert_own"
  ON mission_participations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mission_participations_delete_own"
  ON mission_participations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 참여 수 캐시 컬럼
ALTER TABLE mission_posts
  ADD COLUMN IF NOT EXISTS participation_count INTEGER NOT NULL DEFAULT 0;

-- 참여 추가 시 EXP +30, 카운트 +1
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 참여 취소 시 EXP -30, 카운트 -1
CREATE OR REPLACE FUNCTION handle_mission_participation_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mission_posts
    SET participation_count = GREATEST(0, participation_count - 1)
  WHERE id = OLD.post_id;

  UPDATE avatars
    SET exp = GREATEST(0, exp - 30), updated_at = NOW()
  WHERE user_id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_mission_participation_insert
  AFTER INSERT ON mission_participations
  FOR EACH ROW EXECUTE FUNCTION handle_mission_participation_insert();

CREATE TRIGGER trg_mission_participation_delete
  AFTER DELETE ON mission_participations
  FOR EACH ROW EXECUTE FUNCTION handle_mission_participation_delete();

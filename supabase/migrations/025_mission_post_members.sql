-- 선교 활동 참가자 명단 테이블
CREATE TABLE IF NOT EXISTS mission_post_members (
  id       BIGSERIAL PRIMARY KEY,
  post_id  BIGINT NOT NULL REFERENCES mission_posts(id) ON DELETE CASCADE,
  name     TEXT   NOT NULL
);

ALTER TABLE mission_post_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mission_post_members_select_all"
  ON mission_post_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "mission_post_members_insert_leader"
  ON mission_post_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mission_posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "mission_post_members_delete_leader"
  ON mission_post_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mission_posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

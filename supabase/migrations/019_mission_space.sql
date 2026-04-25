-- ============================================================
-- 019_mission_space.sql
-- 선교 공간 — 활동 현황 + 기도 요청
-- ============================================================

-- ── 선교회 활동 현황 게시글 ───────────────────────────────────
CREATE TABLE mission_posts (
  id          BIGSERIAL   PRIMARY KEY,
  mission_id  INTEGER     NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mission_posts_mission_created
  ON mission_posts(mission_id, created_at DESC);

ALTER TABLE mission_posts ENABLE ROW LEVEL SECURITY;

-- 조회: 모든 인증 사용자
CREATE POLICY "mission_posts_select"
  ON mission_posts FOR SELECT TO authenticated USING (true);

-- 작성: mission_leader(해당 선교회) + pastor + youth_pastor
CREATE POLICY "mission_posts_insert"
  ON mission_posts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
      OR (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'mission_leader'
        AND (SELECT mission_id FROM profiles WHERE id = auth.uid()) = mission_id
      )
    )
  );

-- 삭제: 본인 + pastor
CREATE POLICY "mission_posts_delete"
  ON mission_posts FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  );

-- ── 선교 기도 요청 ────────────────────────────────────────────
CREATE TABLE mission_prayers (
  id           BIGSERIAL   PRIMARY KEY,
  mission_id   INTEGER     NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  is_anonymous BOOLEAN     NOT NULL DEFAULT FALSE,
  amen_count   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mission_prayers_mission_created
  ON mission_prayers(mission_id, created_at DESC);

ALTER TABLE mission_prayers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mission_prayers_select"
  ON mission_prayers FOR SELECT TO authenticated USING (true);

CREATE POLICY "mission_prayers_insert"
  ON mission_prayers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mission_prayers_delete"
  ON mission_prayers FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  );

-- ── 아멘 테이블 ───────────────────────────────────────────────
CREATE TABLE mission_prayer_amens (
  prayer_id   BIGINT  NOT NULL REFERENCES mission_prayers(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (prayer_id, user_id)
);

ALTER TABLE mission_prayer_amens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mission_prayer_amens_select"
  ON mission_prayer_amens FOR SELECT TO authenticated USING (true);

CREATE POLICY "mission_prayer_amens_insert"
  ON mission_prayer_amens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "mission_prayer_amens_delete"
  ON mission_prayer_amens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 아멘 카운트 자동 동기화 트리거
CREATE OR REPLACE FUNCTION sync_mission_prayer_amen_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE mission_prayers SET amen_count = amen_count + 1 WHERE id = NEW.prayer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE mission_prayers SET amen_count = GREATEST(0, amen_count - 1) WHERE id = OLD.prayer_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mission_prayer_amen_count
  AFTER INSERT OR DELETE ON mission_prayer_amens
  FOR EACH ROW EXECUTE FUNCTION sync_mission_prayer_amen_count();

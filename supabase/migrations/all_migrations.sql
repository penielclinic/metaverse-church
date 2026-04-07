-- ============================================================
-- 이음 메타버스 — 전체 마이그레이션 통합본
-- Supabase SQL Editor에 그대로 붙여넣기 후 실행
-- 순서: 001 → 009
-- ============================================================


-- ============================================================
-- 001_profiles.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  phone       TEXT,
  role        TEXT        NOT NULL DEFAULT 'youth'
                          CHECK (role IN ('youth', 'cell_leader', 'youth_pastor', 'pastor')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());


-- ============================================================
-- 002_avatars.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS avatars (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  skin_tone   TEXT        NOT NULL DEFAULT 'medium'
                          CHECK (skin_tone IN ('light', 'medium', 'tan', 'dark')),
  hair_style  TEXT        NOT NULL DEFAULT 'short'
                          CHECK (hair_style IN ('short', 'long', 'curly', 'bald', 'ponytail')),
  outfit      TEXT        NOT NULL DEFAULT 'casual'
                          CHECK (outfit IN ('casual', 'formal', 'hanbok', 'worship_team', 'pastor')),
  level       INTEGER     NOT NULL DEFAULT 1 CHECK (level >= 1),
  exp         INTEGER     NOT NULL DEFAULT 0 CHECK (exp >= 0),
  glow_color  TEXT,
  active_badge TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_avatars_updated_at
  BEFORE UPDATE ON avatars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avatars_select_all"
  ON avatars FOR SELECT TO authenticated USING (true);

CREATE POLICY "avatars_update_own"
  ON avatars FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "avatars_insert_own"
  ON avatars FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ============================================================
-- 003_cells.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS missions (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL,
  leader_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cells (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL,
  leader_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  mission_id  INTEGER     REFERENCES missions(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cell_id    INTEGER REFERENCES cells(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mission_id INTEGER REFERENCES missions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cells_mission_id    ON cells(mission_id);
CREATE INDEX IF NOT EXISTS idx_profiles_cell_id    ON profiles(cell_id);
CREATE INDEX IF NOT EXISTS idx_profiles_mission_id ON profiles(mission_id);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "missions_select_all"
  ON missions FOR SELECT TO authenticated USING (true);

CREATE POLICY "cells_select_all"
  ON cells FOR SELECT TO authenticated USING (true);

CREATE POLICY "missions_modify_leaders"
  ON missions FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
  );

CREATE POLICY "cells_modify_leaders"
  ON cells FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('cell_leader', 'youth_pastor', 'pastor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('cell_leader', 'youth_pastor', 'pastor')
  );


-- ============================================================
-- 004_challenge_system.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS badge_definitions (
  id          SERIAL      PRIMARY KEY,
  slug        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  icon_url    TEXT,
  rarity      TEXT        NOT NULL DEFAULT 'common'
                          CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id      INTEGER     NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS challenges (
  id            SERIAL      PRIMARY KEY,
  slug          TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  type          TEXT        NOT NULL
                            CHECK (type IN ('attendance', 'devotion', 'prayer', 'cell', 'mission', 'share')),
  target_count  INTEGER     NOT NULL DEFAULT 1,
  badge_id      INTEGER     REFERENCES badge_definitions(id) ON DELETE SET NULL,
  exp_reward    INTEGER     NOT NULL DEFAULT 50,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_logs (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id  INTEGER     NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress      INTEGER     NOT NULL DEFAULT 0,
  completed     BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_challenge_logs_updated_at
  BEFORE UPDATE ON challenge_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_challenge_logs_user_challenge
  ON challenge_logs(user_id, challenge_id);

CREATE TABLE IF NOT EXISTS streaks (
  id              BIGSERIAL   PRIMARY KEY,
  user_id         UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak  INTEGER     NOT NULL DEFAULT 0,
  longest_streak  INTEGER     NOT NULL DEFAULT 0,
  last_activity   DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO badge_definitions (slug, name, description, rarity) VALUES
  ('devotion_7days',   '큐티 7일',    '7일 연속 큐티 인증을 완료했습니다',           'common'),
  ('worship_10times',  '예배 10회',   '메타버스 예배에 10회 참석했습니다',            'rare'),
  ('intercessor',      '중보기도사',  '기도실에서 30개 이상의 기도제목에 아멘했습니다', 'rare'),
  ('cell_mvp',         '셀 MVP',      '셀 모임에 한 달간 개근했습니다',               'epic'),
  ('testimony_king',   '간증왕',      '간증을 5회 이상 나눴습니다',                  'epic'),
  ('missionary',       '선교사',      '선교회 사역에 10회 이상 참여했습니다',          'legendary'),
  ('sharing_king',     '나눔왕',      '다른 성도에게 10회 이상 섬김을 나눴습니다',     'epic')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badge_definitions_select_all"
  ON badge_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "challenges_select_all"
  ON challenges FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_badges_select_all"
  ON user_badges FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_badges_insert_own"
  ON user_badges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "challenge_logs_own"
  ON challenge_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "streaks_own"
  ON streaks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ============================================================
-- 005_devotion.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS devotion_logs (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  bible_ref     TEXT,
  content       TEXT,
  image_url     TEXT,
  is_public     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, logged_date)
);

CREATE INDEX IF NOT EXISTS idx_devotion_logs_user_date
  ON devotion_logs(user_id, logged_date DESC);

CREATE TABLE IF NOT EXISTS sermons (
  id            SERIAL      PRIMARY KEY,
  title         TEXT        NOT NULL,
  preacher      TEXT        NOT NULL DEFAULT '유진성',
  preached_at   DATE        NOT NULL,
  bible_ref     TEXT,
  youtube_id    TEXT,
  summary       TEXT,
  full_text     TEXT,
  is_published  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_sermons_updated_at
  BEFORE UPDATE ON sermons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_sermons_preached_at
  ON sermons(preached_at DESC);

ALTER TABLE devotion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermons        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devotion_logs_select"
  ON devotion_logs FOR SELECT TO authenticated
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "devotion_logs_own_write"
  ON devotion_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "devotion_logs_own_update"
  ON devotion_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "devotion_logs_own_delete"
  ON devotion_logs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sermons_select_published"
  ON sermons FOR SELECT TO authenticated
  USING (is_published = true);

CREATE POLICY "sermons_manage"
  ON sermons FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
  );


-- ============================================================
-- 006_prayer_notes.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS prayer_notes (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  is_anonymous  BOOLEAN     NOT NULL DEFAULT FALSE,
  amen_count    INTEGER     NOT NULL DEFAULT 0 CHECK (amen_count >= 0),
  pos_x         FLOAT       NOT NULL DEFAULT 0,
  pos_y         FLOAT       NOT NULL DEFAULT 0,
  color         TEXT        NOT NULL DEFAULT 'yellow'
                            CHECK (color IN ('yellow', 'pink', 'blue', 'green', 'purple')),
  is_answered   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_prayer_notes_updated_at
  BEFORE UPDATE ON prayer_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_prayer_notes_created_at
  ON prayer_notes(created_at DESC);

CREATE TABLE IF NOT EXISTS prayer_amens (
  id          BIGSERIAL   PRIMARY KEY,
  note_id     BIGINT      NOT NULL REFERENCES prayer_notes(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (note_id, user_id)
);

ALTER TABLE prayer_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_amens  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prayer_notes_select_all"
  ON prayer_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "prayer_notes_insert_own"
  ON prayer_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "prayer_notes_update_own"
  ON prayer_notes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "prayer_notes_delete_own_or_pastor"
  ON prayer_notes FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'pastor'
  );

CREATE POLICY "prayer_amens_select_all"
  ON prayer_amens FOR SELECT TO authenticated USING (true);

CREATE POLICY "prayer_amens_insert_own"
  ON prayer_amens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "prayer_amens_delete_own"
  ON prayer_amens FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ============================================================
-- 007_counsel.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS counsel_posts (
  id              BIGSERIAL   PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  content         TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  category        TEXT        NOT NULL DEFAULT 'general'
                              CHECK (category IN ('family', 'faith', 'relationship', 'career', 'health', 'general')),
  is_anonymous    BOOLEAN     NOT NULL DEFAULT TRUE,
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'in_progress', 'closed')),
  assigned_to     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_counsel_posts_updated_at
  BEFORE UPDATE ON counsel_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_counsel_posts_status
  ON counsel_posts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS counsel_bookings (
  id              BIGSERIAL   PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  counselor_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INTEGER     NOT NULL DEFAULT 30 CHECK (duration_min IN (30, 60)),
  method          TEXT        NOT NULL DEFAULT 'metaverse'
                              CHECK (method IN ('metaverse', 'phone', 'in_person')),
  note            TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_counsel_bookings_updated_at
  BEFORE UPDATE ON counsel_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_counsel_bookings_scheduled
  ON counsel_bookings(counselor_id, scheduled_at);

CREATE TABLE IF NOT EXISTS counsel_messages (
  id              BIGSERIAL   PRIMARY KEY,
  booking_id      BIGINT      NOT NULL REFERENCES counsel_bookings(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counsel_messages_booking
  ON counsel_messages(booking_id, created_at ASC);

ALTER TABLE counsel_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE counsel_bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE counsel_messages  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "counsel_posts_select_public"
  ON counsel_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "counsel_posts_insert_own"
  ON counsel_posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "counsel_posts_update_own_or_assigned"
  ON counsel_posts FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR assigned_to = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
  );

CREATE POLICY "counsel_bookings_own_parties"
  ON counsel_bookings FOR ALL TO authenticated
  USING (user_id = auth.uid() OR counselor_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR counselor_id = auth.uid());

CREATE POLICY "counsel_messages_parties_only"
  ON counsel_messages FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM counsel_bookings
      WHERE user_id = auth.uid() OR counselor_id = auth.uid()
    )
  );

CREATE POLICY "counsel_messages_send_own"
  ON counsel_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND booking_id IN (
      SELECT id FROM counsel_bookings
      WHERE user_id = auth.uid() OR counselor_id = auth.uid()
    )
  );


-- ============================================================
-- 008_realtime.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS spaces (
  id          SERIAL      PRIMARY KEY,
  slug        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL
                          CHECK (type IN ('sanctuary','plaza','cell','prayer','library','scholarship')),
  capacity    INTEGER     NOT NULL DEFAULT 50,
  cell_id     INTEGER     REFERENCES cells(id) ON DELETE SET NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO spaces (slug, name, type, capacity) VALUES
  ('sanctuary',   '본당',        'sanctuary',   200),
  ('plaza',       '교제광장',    'plaza',        100),
  ('prayer',      '기도실',      'prayer',        30),
  ('library',     '설교 도서관', 'library',       50),
  ('scholarship', '장학관',      'scholarship',   20)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS chat_messages (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id    INTEGER     NOT NULL REFERENCES spaces(id)   ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  type        TEXT        NOT NULL DEFAULT 'text'
                          CHECK (type IN ('text', 'emoji', 'system')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_space_created
  ON chat_messages(space_id, created_at DESC);

CREATE TABLE IF NOT EXISTS presence_log (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  space_id    INTEGER     NOT NULL REFERENCES spaces(id)   ON DELETE CASCADE,
  pos_x       FLOAT       NOT NULL DEFAULT 0,
  pos_z       FLOAT       NOT NULL DEFAULT 0,
  entered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_log_space_user
  ON presence_log(space_id, user_id);

ALTER TABLE spaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_log  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spaces_select_all"
  ON spaces FOR SELECT TO authenticated USING (true);

CREATE POLICY "spaces_manage_leaders"
  ON spaces FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
  );

CREATE POLICY "chat_messages_select"
  ON chat_messages FOR SELECT TO authenticated
  USING (
    (SELECT cell_id FROM spaces WHERE id = space_id) IS NULL
    OR space_id IN (
      SELECT s.id FROM spaces s
      JOIN cells c ON s.cell_id = c.id
      JOIN profiles p ON p.cell_id = c.id
      WHERE p.id = auth.uid()
    )
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
  );

CREATE POLICY "chat_messages_insert_own"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (SELECT cell_id FROM spaces WHERE id = space_id) IS NULL
      OR space_id IN (
        SELECT s.id FROM spaces s
        JOIN cells c ON s.cell_id = c.id
        JOIN profiles p ON p.cell_id = c.id
        WHERE p.id = auth.uid()
      )
      OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('youth_pastor', 'pastor')
    )
  );

CREATE POLICY "presence_log_select_all"
  ON presence_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "presence_log_insert_own"
  ON presence_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Realtime Publication 활성화
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'prayer_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prayer_notes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'presence_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE presence_log;
  END IF;
END $$;


-- ============================================================
-- 009_devotion_amens.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS devotion_amens (
  devotion_id  BIGINT  NOT NULL REFERENCES devotion_logs(id) ON DELETE CASCADE,
  user_id      UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (devotion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_devotion_amens_devotion
  ON devotion_amens(devotion_id);

ALTER TABLE avatars
  ADD COLUMN IF NOT EXISTS devotion_streak    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_devotion_date DATE;

ALTER TABLE devotion_amens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devotion_amens_select_all"
  ON devotion_amens FOR SELECT TO authenticated USING (true);

CREATE POLICY "devotion_amens_insert_own"
  ON devotion_amens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "devotion_amens_delete_own"
  ON devotion_amens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

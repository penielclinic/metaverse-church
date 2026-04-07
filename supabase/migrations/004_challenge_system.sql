-- ============================================================
-- 004_challenge_system.sql
-- 도전과제·뱃지·연속 출석(streaks) 시스템
-- ============================================================

-- ── 뱃지 정의 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badge_definitions (
  id          SERIAL      PRIMARY KEY,
  slug        TEXT        NOT NULL UNIQUE,   -- avatars.active_badge 참조 키
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  icon_url    TEXT,
  rarity      TEXT        NOT NULL DEFAULT 'common'
                          CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 유저 획득 뱃지 ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id      INTEGER     NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

-- ── 도전과제 정의 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id            SERIAL      PRIMARY KEY,
  slug          TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  type          TEXT        NOT NULL
                            CHECK (type IN ('attendance', 'devotion', 'prayer', 'cell', 'mission', 'share')),
  target_count  INTEGER     NOT NULL DEFAULT 1,   -- 목표 횟수
  badge_id      INTEGER     REFERENCES badge_definitions(id) ON DELETE SET NULL,
  exp_reward    INTEGER     NOT NULL DEFAULT 50,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 도전과제 진행 로그 ───────────────────────────────────────
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

-- ── 연속 출석/큐티 스트릭 ───────────────────────────────────
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

-- ── 기본 뱃지 7개 INSERT ─────────────────────────────────────
INSERT INTO badge_definitions (slug, name, description, rarity) VALUES
  ('devotion_7days',   '큐티 7일',    '7일 연속 큐티 인증을 완료했습니다',          'common'),
  ('worship_10times',  '예배 10회',   '메타버스 예배에 10회 참석했습니다',           'rare'),
  ('intercessor',      '중보기도사',  '기도실에서 30개 이상의 기도제목에 아멘했습니다', 'rare'),
  ('cell_mvp',         '셀 MVP',      '셀 모임에 한 달간 개근했습니다',              'epic'),
  ('testimony_king',   '간증왕',      '간증을 5회 이상 나눴습니다',                 'epic'),
  ('missionary',       '선교사',      '선교회 사역에 10회 이상 참여했습니다',         'legendary'),
  ('sharing_king',     '나눔왕',      '다른 성도에게 10회 이상 섬김을 나눴습니다',    'epic')
ON CONFLICT (slug) DO NOTHING;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges       ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks           ENABLE ROW LEVEL SECURITY;

-- 뱃지 정의·도전과제 전체 조회
CREATE POLICY "badge_definitions_select_all"
  ON badge_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "challenges_select_all"
  ON challenges FOR SELECT TO authenticated USING (true);

-- 유저 뱃지: 전체 조회, 본인만 INSERT (서버에서 수여)
CREATE POLICY "user_badges_select_all"
  ON user_badges FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_badges_insert_own"
  ON user_badges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 도전과제 로그: 본인 것만 조회·수정
CREATE POLICY "challenge_logs_own"
  ON challenge_logs FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 스트릭: 본인 것만 조회·수정
CREATE POLICY "streaks_own"
  ON streaks FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

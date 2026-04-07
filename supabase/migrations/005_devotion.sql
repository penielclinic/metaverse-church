-- ============================================================
-- 005_devotion.sql
-- 큐티(경건 생활) 인증 로그 + 설교 아카이브
-- ============================================================

-- ── 큐티 인증 로그 ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devotion_logs (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  bible_ref     TEXT,                               -- ex) '요한복음 3:16'
  content       TEXT,                               -- 묵상 내용 (선택)
  image_url     TEXT,                               -- 인증 사진 (Supabase Storage)
  is_public     BOOLEAN     NOT NULL DEFAULT TRUE,  -- 셀원 공개 여부
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, logged_date)                     -- 하루 1회만 인증
);

CREATE INDEX IF NOT EXISTS idx_devotion_logs_user_date
  ON devotion_logs(user_id, logged_date DESC);

-- ── 설교 아카이브 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sermons (
  id            SERIAL      PRIMARY KEY,
  title         TEXT        NOT NULL,
  preacher      TEXT        NOT NULL DEFAULT '유진성',
  preached_at   DATE        NOT NULL,
  bible_ref     TEXT,                               -- 본문 말씀
  youtube_id    TEXT,                               -- YouTube 영상 ID
  summary       TEXT,                               -- AI 3줄 요약 (nullable, 생성 후 채움)
  full_text     TEXT,                               -- 설교 전문
  is_published  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_sermons_updated_at
  BEFORE UPDATE ON sermons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_sermons_preached_at
  ON sermons(preached_at DESC);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE devotion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermons        ENABLE ROW LEVEL SECURITY;

-- 큐티 로그: 공개 항목은 전체 조회, 비공개는 본인만
CREATE POLICY "devotion_logs_select"
  ON devotion_logs FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());

-- 큐티 로그: 본인만 생성·수정·삭제
CREATE POLICY "devotion_logs_own_write"
  ON devotion_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "devotion_logs_own_update"
  ON devotion_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "devotion_logs_own_delete"
  ON devotion_logs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 설교 아카이브: 게시된 것만 전체 조회
CREATE POLICY "sermons_select_published"
  ON sermons FOR SELECT
  TO authenticated
  USING (is_published = true);

-- 설교 관리: youth_pastor / pastor만
CREATE POLICY "sermons_manage"
  ON sermons FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('youth_pastor', 'pastor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid())
    IN ('youth_pastor', 'pastor')
  );

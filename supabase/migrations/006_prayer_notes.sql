-- ============================================================
-- 006_prayer_notes.sql
-- 기도실 포스트잇 기도제목
-- ============================================================

CREATE TABLE IF NOT EXISTS prayer_notes (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  is_anonymous  BOOLEAN     NOT NULL DEFAULT FALSE,
  amen_count    INTEGER     NOT NULL DEFAULT 0 CHECK (amen_count >= 0),

  -- 기도실 3D 벽 위치 (Three.js 좌표)
  pos_x         FLOAT       NOT NULL DEFAULT 0,
  pos_y         FLOAT       NOT NULL DEFAULT 0,

  color         TEXT        NOT NULL DEFAULT 'yellow'
                            CHECK (color IN ('yellow', 'pink', 'blue', 'green', 'purple')),
  is_answered   BOOLEAN     NOT NULL DEFAULT FALSE,   -- 응답받은 기도
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_prayer_notes_updated_at
  BEFORE UPDATE ON prayer_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_prayer_notes_created_at
  ON prayer_notes(created_at DESC);

-- 아멘 반응 테이블 (중복 방지)
CREATE TABLE IF NOT EXISTS prayer_amens (
  id          BIGSERIAL   PRIMARY KEY,
  note_id     BIGINT      NOT NULL REFERENCES prayer_notes(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (note_id, user_id)
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE prayer_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_amens  ENABLE ROW LEVEL SECURITY;

-- 전체 조회 가능 (익명 포함, user_id는 is_anonymous=false 일 때만 의미 있음)
CREATE POLICY "prayer_notes_select_all"
  ON prayer_notes FOR SELECT TO authenticated USING (true);

-- 본인만 생성
CREATE POLICY "prayer_notes_insert_own"
  ON prayer_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 본인만 수정
CREATE POLICY "prayer_notes_update_own"
  ON prayer_notes FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 본인만 삭제 (pastor는 모두 삭제 가능)
CREATE POLICY "prayer_notes_delete_own_or_pastor"
  ON prayer_notes FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'pastor'
  );

-- 아멘: 전체 조회, 본인만 추가·삭제
CREATE POLICY "prayer_amens_select_all"
  ON prayer_amens FOR SELECT TO authenticated USING (true);

CREATE POLICY "prayer_amens_insert_own"
  ON prayer_amens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "prayer_amens_delete_own"
  ON prayer_amens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

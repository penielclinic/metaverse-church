-- ============================================================
-- 001_profiles.sql
-- 사용자 프로필 테이블
-- cell_id / mission_id FK는 003_cells.sql 이후 ALTER TABLE로 추가
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  phone       TEXT,
  role        TEXT        NOT NULL DEFAULT 'youth'
                          CHECK (role IN ('youth', 'cell_leader', 'youth_pastor', 'pastor')),
  -- cell_id / mission_id 는 003_cells.sql 에서 ALTER TABLE로 추가
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 자동 갱신 트리거
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

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 전체 조회 가능 (로그인 사용자)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- 본인만 수정 가능
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 본인 행만 INSERT (소셜 로그인 후 프로필 생성)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- 삭제 불가 (탈퇴는 auth.users CASCADE로 처리)

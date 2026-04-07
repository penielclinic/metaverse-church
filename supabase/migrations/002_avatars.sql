-- ============================================================
-- 002_avatars.sql
-- 아바타 테이블 (성도 1명 = 아바타 1개)
-- ============================================================

CREATE TABLE IF NOT EXISTS avatars (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- 외모 커스터마이징
  skin_tone   TEXT        NOT NULL DEFAULT 'medium'
                          CHECK (skin_tone IN ('light', 'medium', 'tan', 'dark')),
  hair_style  TEXT        NOT NULL DEFAULT 'short'
                          CHECK (hair_style IN ('short', 'long', 'curly', 'bald', 'ponytail')),
  outfit      TEXT        NOT NULL DEFAULT 'casual'
                          CHECK (outfit IN ('casual', 'formal', 'hanbok', 'worship_team', 'pastor')),

  -- 신앙 성장
  level       INTEGER     NOT NULL DEFAULT 1 CHECK (level >= 1),
  exp         INTEGER     NOT NULL DEFAULT 0 CHECK (exp >= 0),

  -- 예배 참석 시 발광 색상 (null = 비활성)
  glow_color  TEXT,       -- ex) '#FFD700', '#A8EDEA', null

  -- 현재 장착 뱃지 (badge_definitions.slug)
  active_badge TEXT,

  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_avatars_updated_at
  BEFORE UPDATE ON avatars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

-- 전체 조회 가능 (다른 성도 아바타 렌더링 필요)
CREATE POLICY "avatars_select_all"
  ON avatars FOR SELECT
  TO authenticated
  USING (true);

-- 본인만 수정
CREATE POLICY "avatars_update_own"
  ON avatars FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 본인만 생성
CREATE POLICY "avatars_insert_own"
  ON avatars FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

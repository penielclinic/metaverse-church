-- ============================================================
-- 017_sharing_market.sql
-- 나눔장터 — 성도들이 물품·재능을 나누는 커뮤니티 장터
-- ============================================================

CREATE TABLE sharing_items (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL CHECK (category IN ('clothes', 'books', 'food', 'talent', 'etc')),
  type        TEXT NOT NULL CHECK (type IN ('free', 'barter', 'sale')),
  price       INTEGER,                       -- sale 타입일 때만 사용 (원)
  contact     TEXT,                          -- 연락처 (카카오 ID 또는 전화번호)
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reserved', 'done')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sharing_items ENABLE ROW LEVEL SECURITY;

-- 로그인한 성도 누구나 목록 조회
CREATE POLICY "sharing_items_select"
  ON sharing_items FOR SELECT TO authenticated
  USING (true);

-- 본인만 등록
CREATE POLICY "sharing_items_insert"
  ON sharing_items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 본인만 수정 (상태 변경 등)
CREATE POLICY "sharing_items_update"
  ON sharing_items FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 본인만 삭제
CREATE POLICY "sharing_items_delete"
  ON sharing_items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 007_counsel.sql
-- 익명 고민 게시판 + 상담 예약 + 1:1 채팅
-- ============================================================

-- ── 익명 고민 게시판 ─────────────────────────────────────────
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
  assigned_to     UUID        REFERENCES profiles(id) ON DELETE SET NULL,  -- 담당 목사/청년부목사
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_counsel_posts_updated_at
  BEFORE UPDATE ON counsel_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_counsel_posts_status
  ON counsel_posts(status, created_at DESC);

-- ── 상담 예약 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS counsel_bookings (
  id              BIGSERIAL   PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  counselor_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INTEGER     NOT NULL DEFAULT 30 CHECK (duration_min IN (30, 60)),
  method          TEXT        NOT NULL DEFAULT 'metaverse'
                              CHECK (method IN ('metaverse', 'phone', 'in_person')),
  note            TEXT,                                          -- 상담 전 메모
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

-- ── 1:1 채팅 메시지 ──────────────────────────────────────────
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

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE counsel_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE counsel_bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE counsel_messages  ENABLE ROW LEVEL SECURITY;

-- counsel_posts 조회:
--   일반 성도 → is_anonymous=true 인 경우 user_id 숨김 (컬럼 노출은 앱에서 처리)
--   youth_pastor / pastor → user_id 포함 전체 조회 가능
CREATE POLICY "counsel_posts_select_public"
  ON counsel_posts FOR SELECT TO authenticated
  USING (
    -- 모든 로그인 사용자: 게시글 조회 가능 (user_id 마스킹은 앱 레이어에서 처리)
    true
  );

-- 단, user_id를 직접 노출하는 관리자 조회는 pastor/youth_pastor만
-- (실제 구현 시 서버 API에서 role 체크 후 마스킹 처리 권장)

-- 본인만 생성
CREATE POLICY "counsel_posts_insert_own"
  ON counsel_posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 본인 또는 담당자(assigned_to)만 수정
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

-- counsel_bookings: 당사자(user_id, counselor_id)만 조회·수정
CREATE POLICY "counsel_bookings_own_parties"
  ON counsel_bookings FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR counselor_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR counselor_id = auth.uid()
  );

-- counsel_messages: 해당 예약의 당사자만 조회·전송
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

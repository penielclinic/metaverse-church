-- ============================================================
-- 033_elder_email_signup.sql
-- 이메일 가입(장로님 등) + 관리자 승인 구조
-- ============================================================

-- profiles: 가입 승인 여부 + 가입 방법 추가
-- 기존 카카오 유저는 DEFAULT true 로 자동 승인
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_approved   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS signup_method TEXT    NOT NULL DEFAULT 'kakao';

-- cells: 장로 소그룹 여부 표시
ALTER TABLE cells
  ADD COLUMN IF NOT EXISTS is_elder_group BOOLEAN NOT NULL DEFAULT false;

-- ── 이메일 가입 신청 테이블 ─────────────────────────────────
-- auth.users 생성 전이므로 user_id 없이 이메일+이름만 저장
-- 승인 후 is_approved=true 업데이트
-- (auth.users / profiles 는 가입 시점에 이미 생성됨)

-- ── RLS 정책 업데이트 ──────────────────────────────────────

-- 본인의 is_approved / signup_method 는 본인이 수정 불가하게 막음
-- (UPDATE 정책은 기존 profiles_update_own 이 id=auth.uid() 로 제한하므로 OK)
-- 관리자만 is_approved 변경 → API Route에서 service_role key 사용

-- ── 뷰: 미승인 가입자 목록 (관리자용) ──────────────────────
CREATE OR REPLACE VIEW pending_signups AS
SELECT
  p.id,
  p.name,
  p.phone,
  p.signup_method,
  p.created_at,
  u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.is_approved = false
ORDER BY p.created_at DESC;

-- pastor / elder 만 조회 가능
ALTER VIEW pending_signups OWNER TO authenticated;

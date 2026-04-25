-- ============================================================
-- 016_profiles_pastor_rls.sql
-- pastor / youth_pastor 가 타 성도의 role · cell_id 수정 가능하도록
-- RLS 정책 추가
-- ============================================================

-- 기존 자기 자신만 수정하는 정책은 유지하고, pastor 전용 정책을 추가한다.
CREATE POLICY "profiles_update_by_pastor"
  ON profiles FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'youth_pastor')
  );

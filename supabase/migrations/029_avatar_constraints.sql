-- 029_avatar_constraints.sql
-- avatars 테이블의 outfit, hair_style CHECK 제약 확장

-- outfit 제약 교체 (새 복장 5개 추가)
ALTER TABLE avatars DROP CONSTRAINT IF EXISTS avatars_outfit_check;
ALTER TABLE avatars ADD CONSTRAINT avatars_outfit_check
  CHECK (outfit IN (
    'casual', 'formal', 'hanbok', 'worship_team', 'pastor',
    'hoodie', 'shirt', 'blouse', 'sweater', 'vest'
  ));

-- hair_style 제약 제거 (base+bangs+color 조합 형식이라 고정 목록 검증 불가)
ALTER TABLE avatars DROP CONSTRAINT IF EXISTS avatars_hair_style_check;

-- gender 컬럼 추가 (없는 경우)
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';

-- 1. 기존의 제한적인 조회 정책 삭제
DROP POLICY IF EXISTS "사용자는 자신의 프로필만 볼 수 있음" ON public.profiles;

-- 2. 모든 인증된 사용자가 다른 사용자의 프로필(기본 정보)을 검색할 수 있도록 새 정책 추가
-- 이 정책이 있어야 검색 기능에서 다른 유저를 찾을 수 있습니다.
CREATE POLICY "인증된 사용자는 기본 프로필 검색 가능" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. (추가 보안) 민감한 정보는 숨기고 싶다면 여기에 추가 설정을 할 수 있지만, 
-- 현재는 이메일과 닉네임만 있으므로 검색을 위해 전체 허용합니다.

-- 1. 무한 루프 방지용 보안 함수 (RLS 우회 체크)
CREATE OR REPLACE FUNCTION public.check_is_project_member(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = p_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 기존 정책 삭제
DROP POLICY IF EXISTS "멤버인 프로젝트만 조회 가능" ON public.projects;
DROP POLICY IF EXISTS "멤버 목록 조회 가능" ON public.project_members;
DROP POLICY IF EXISTS "인증된 유저만 프로젝트 생성 가능" ON public.projects;
DROP POLICY IF EXISTS "프로젝트 조회 정책" ON public.projects;
DROP POLICY IF EXISTS "프로젝트 생성 정책" ON public.projects;
DROP POLICY IF EXISTS "프로젝트 멤버 조회 정책" ON public.project_members;

-- 3. 프로젝트(projects) 테이블 정책 재설정
-- 조회: 내가 만든 프로젝트거나, 멤버로 등록된 프로젝트만 조회 가능
CREATE POLICY "프로젝트 조회 정책" 
ON public.projects FOR SELECT 
USING (
  created_by = auth.uid() OR public.check_is_project_member(id)
);

-- 생성: 이메일 인증 여부와 상관없이 '로그인한 상태'라면 누구나 생성 가능
-- (사용자님의 요청대로 이메일 인증이 꺼진 상태에서도 동작하도록 설정)
CREATE POLICY "프로젝트 생성 정책" 
ON public.projects FOR INSERT 
WITH CHECK (true); 

-- 4. 프로젝트 멤버(project_members) 테이블 정책 재설정
-- 조회: 내가 멤버인 프로젝트의 전체 멤버 목록은 볼 수 있음
CREATE POLICY "프로젝트 멤버 조회 정책" 
ON public.project_members FOR SELECT 
USING (
  public.check_is_project_member(project_id)
);

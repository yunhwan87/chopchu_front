-- 1. 프로젝트 멤버 추가 정책 (INSERT)
-- 프로젝트의 소유자(owner)나 관리자(admin)만 새로운 멤버를 추가할 수 있습니다.
CREATE POLICY "프로젝트 소유자/관리자는 멤버 초대 가능" 
ON public.project_members FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_members.project_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- 2. 프로젝트 멤버 삭제 정책 (DELETE)
-- 소유자나 관리자만 멤버를 내보낼 수 있습니다.
CREATE POLICY "프로젝트 소유자/관리자는 멤버 내보내기 가능" 
ON public.project_members FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_members.project_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- 3. 프로젝트 멤버 수정 정책 (UPDATE) - 역할 변경 등
CREATE POLICY "프로젝트 소유자/관리자는 멤버 역할 변경 가능" 
ON public.project_members FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_members.project_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

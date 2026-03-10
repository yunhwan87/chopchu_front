-- 1. 프로젝트 테이블 생성
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hold')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 프로젝트 멤버 테이블 (다대다 관계)
-- 사용자의 '프로젝트 디테일' 테이블 요구사항 중 '참여 유저 리스트' 역할
CREATE TABLE public.project_members (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (project_id, user_id)
);

-- 3. RLS 설정
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 3-1. 프로젝트 조회 정책: 멤버인 프로젝트만 조회 가능
CREATE POLICY "멤버인 프로젝트만 조회 가능" 
ON public.projects FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_members.project_id = id AND project_members.user_id = auth.uid()
  )
);

-- 3-2. 프로젝트 생성 정책: 인증된 유저라면 생성 가능
CREATE POLICY "인증된 유저만 프로젝트 생성 가능" 
ON public.projects FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- 3-3. 프로젝트 멤버 권한: 프로젝트 멤버라면 목록 조회 가능
CREATE POLICY "멤버 목록 조회 가능" 
ON public.project_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members AS members
    WHERE members.project_id = project_id AND members.user_id = auth.uid()
  )
);

-- 4. 프로젝트 생성 시 생성자를 자동으로 owner 멤버로 추가하는 트리거
CREATE OR REPLACE FUNCTION public.handle_new_project() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (new.id, new.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_project();

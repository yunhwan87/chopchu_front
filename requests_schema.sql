-- 기존 테이블들이 있다면 삭제 (실수 방지 및 재생성용)
DROP TABLE IF EXISTS public.request_messages;
DROP TABLE IF EXISTS public.requests;

-- 1. requests (요청 기본 정보) 테이블 생성
CREATE TABLE public.requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL, 
  
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,   -- 최초 요청자
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- 최초 수신자 (담당자)
  
  title TEXT NOT NULL, -- 요청 제목 (UI 표시용)
  
  -- 상태 (수락 대기 중, 해결 중, 추가확인 요청, 해결)
  -- 거절 불가. 해결 안 되는 이유를 달면 '해결'로 간주.
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'in_progress', 'need_info', 'resolved')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. request_messages (요청 스레드 메시지) 테이블 생성
CREATE TABLE public.request_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- 메시지 작성자
  
  content TEXT NOT NULL, -- 메시지 내용 (요청 내용 또는 답변 내용)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. RLS(Row Level Security) 설정
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

-- 3-1. requests 권한 정책 (조회, 생성, 수정)
-- (조회) 해당 프로젝트 멤버라면 누구나 요청을 볼 수 있음
CREATE POLICY "프로젝트 멤버는 요청(requests) 조회 가능" 
ON public.requests FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = public.requests.project_id 
    AND user_id = auth.uid()
  )
);

-- (생성) 해당 프로젝트 멤버라면 누구나 요청을 생성할 수 있음
CREATE POLICY "프로젝트 멤버는 요청(requests) 생성 가능" 
ON public.requests FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = public.requests.project_id 
    AND user_id = auth.uid()
  )
);

-- (수정) 해당 프로젝트 멤버라면 누구나(주로 담당자) 상태를 수정할 수 있음
CREATE POLICY "프로젝트 멤버는 요청(requests) 상태 수정 가능" 
ON public.requests FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = public.requests.project_id 
    AND user_id = auth.uid()
  )
);

-- 3-2. request_messages 권한 정책 (조회, 생성)
-- (조회) 해당 메시지가 속한 요청(requests)의 프로젝트 멤버라면 누구나 조회 가능
CREATE POLICY "프로젝트 멤버는 요청 메시지(request_messages) 조회 가능" 
ON public.request_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.requests r
    JOIN public.project_members pm ON r.project_id = pm.project_id
    WHERE r.id = request_messages.request_id 
    AND pm.user_id = auth.uid()
  )
);

-- (생성) 해당 메시지가 속한 요청(requests)의 프로젝트 멤버라면 누구나 메시지 작성 가능
CREATE POLICY "프로젝트 멤버는 요청 메시지(request_messages) 작성 가능" 
ON public.request_messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.requests r
    JOIN public.project_members pm ON r.project_id = pm.project_id
    WHERE r.id = request_messages.request_id 
    AND pm.user_id = auth.uid()
  )
);

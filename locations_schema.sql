-- 기존 테이블 삭제 (이름 변경을 위한 초기화)
DROP TABLE IF EXISTS public.recruitment_contacts;
DROP TABLE IF EXISTS public.recruitments;
DROP TABLE IF EXISTS public.locations_poc;
DROP TABLE IF EXISTS public.locations;

-- 1. 장소(Location) 테이블 생성 (기존 recruitments에서 변경)
CREATE TABLE public.locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, -- 장소 이름 (기존 섭외지 이름)
  location_date DATE, -- 장소 섭외/방문 날짜
  
  -- 장소 상태 (요청 중, 확정, 보류)
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'hold')),
  
  -- 장소 카드 내의 요청 상태 (코디 답변대기중, 제작진 답변 대기, 장소 답변 대기중)
  card_status TEXT DEFAULT 'pending' 
    CHECK (card_status IN ('coordinator_pending', 'crew_pending', 'pending')),
  
  shooting_time TEXT, -- 촬영 시간
  content TEXT, -- 장소 관련 요청 내용
  
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- 작성자
  request_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 요청 시간
  
  cost DECIMAL(12, 2) DEFAULT 0, -- 비용
  deposit_status BOOLEAN DEFAULT false, -- 선금 여부
  deposit_amount DECIMAL(12, 2) DEFAULT 0, -- 선금 금액
  
  note TEXT, -- 비고
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 장소 담당자(POC) 정보 테이블 (1:N 관계)
-- 한 장소에 여러 담당자를 등록할 수 있음
CREATE TABLE public.locations_poc (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. RLS 설정
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations_poc ENABLE ROW LEVEL SECURITY;

-- 3-1. 장소 조회 정책
CREATE POLICY "프로젝트 멤버는 장소 조회 가능" 
ON public.locations FOR SELECT 
USING (public.check_is_project_member(project_id));

-- 3-2. 장소 생성 정책
CREATE POLICY "프로젝트 멤버는 장소 생성 가능" 
ON public.locations FOR INSERT 
WITH CHECK (public.check_is_project_member(project_id));

-- 3-3. 장소 수정 정책
CREATE POLICY "프로젝트 멤버는 장소 수정 가능" 
ON public.locations FOR UPDATE 
USING (public.check_is_project_member(project_id));

-- 4. 장소 담당자(POC) 정보 정책
CREATE POLICY "프로젝트 멤버는 담당자 정보 조회 가능" 
ON public.locations_poc FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = location_id AND public.check_is_project_member(project_id)
  )
);

CREATE POLICY "프로젝트 멤버는 담당자 정보 추가 가능" 
ON public.locations_poc FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.locations
    WHERE id = location_id AND public.check_is_project_member(project_id)
  )
);

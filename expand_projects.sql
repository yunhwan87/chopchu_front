-- 1. projects 테이블에 기간, 비고 컬럼 추가
ALTER TABLE public.projects 
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE,
ADD COLUMN total_days INTEGER,
ADD COLUMN note TEXT;

-- 2. (선택사항) 참여 인원 리스트는 이미 project_members 테이블에서 관리 중입니다. 
-- 다만, 프로젝트 생성 시 여러 명을 한꺼번에 초대하는 로직은 API 레벨에서 처리할 예정입니다.

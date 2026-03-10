-- locations 테이블에 request_ai_summary 컬럼 추가
ALTER TABLE public.locations
ADD COLUMN request_ai_summary TEXT;

-- 1. 채팅방 멤버인지 파악하는 보안 함수 (메시지 읽기/쓰기에 사용)
CREATE OR REPLACE FUNCTION public.is_room_member(check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_room_members 
    WHERE room_id = check_room_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 기존 정책을 깔끔하게 모두 지우기
DROP POLICY IF EXISTS "채팅방 멤버만 채팅방을 볼 수 있음" ON public.chat_rooms;
DROP POLICY IF EXISTS "채팅방 멤버만 채팅방을 생성할 수 있음" ON public.chat_rooms;
DROP POLICY IF EXISTS "채팅방 조회" ON public.chat_rooms;
DROP POLICY IF EXISTS "채팅방 생성" ON public.chat_rooms;
DROP POLICY IF EXISTS "자신이 속한 멤버십만 접근 가능" ON public.chat_room_members;
DROP POLICY IF EXISTS "멤버 추가/제거" ON public.chat_room_members;
DROP POLICY IF EXISTS "채팅방 멤버 목록 조회" ON public.chat_room_members;
DROP POLICY IF EXISTS "채팅방에 멤버 추가 가능" ON public.chat_room_members;
DROP POLICY IF EXISTS "채팅방 멤버만 메시지를 볼 수 있음" ON public.messages;
DROP POLICY IF EXISTS "채팅방 멤버만 메시지를 작성할 수 있음" ON public.messages;

-- ==========================================
-- 3. 테이블별 올바른 정책 재생성
-- ==========================================

-- [chat_rooms] 테이블 
-- 오류 원인 해결: INSERT 후 RETURNING 과정에서 아직 멤버테이블에 본인이 안들어갔으므로 조회가 안되어 RLS 에러가 났습니다.
-- 해결: 해당 프로젝트의 멤버라면 채팅방의 껍데기(이름) 정보는 조회할 수 있도록 변경합니다.
CREATE POLICY "프로젝트 멤버는 채팅방을 볼 수 있음" 
ON public.chat_rooms FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = public.chat_rooms.project_id AND user_id = auth.uid()
  )
);

CREATE POLICY "채팅방 생성" 
ON public.chat_rooms FOR INSERT 
WITH CHECK (true);

CREATE POLICY "채팅방 업데이트" 
ON public.chat_rooms FOR UPDATE 
USING (true);


-- [chat_room_members] 테이블
CREATE POLICY "멤버 목록 조회" 
ON public.chat_room_members FOR SELECT 
USING (public.is_room_member(room_id) OR user_id = auth.uid());

CREATE POLICY "채팅방에 멤버 추가 가능" 
ON public.chat_room_members FOR INSERT 
WITH CHECK (true);


-- [messages] 테이블 (가장 중요: 메시지는 진짜 그 방 멤버만 읽고 쓰기 가능)
CREATE POLICY "채팅방 멤버만 메시지를 볼 수 있음" 
ON public.messages FOR SELECT 
USING (public.is_room_member(room_id));

CREATE POLICY "채팅방 멤버만 메시지를 작성할 수 있음" 
ON public.messages FOR INSERT 
WITH CHECK (public.is_room_member(room_id) AND sender_id = auth.uid());

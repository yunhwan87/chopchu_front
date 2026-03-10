-- 1. 무한 루프를 방지하기 위해 권한 체킹 전용 보안(Security Definer) 함수를 만듭니다.
-- 이 함수는 RLS를 타지 않고 멤버 존재 여부만 빠르게 확인합니다.
CREATE OR REPLACE FUNCTION public.is_room_member(check_room_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_room_members 
    WHERE room_id = check_room_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 오류를 냈던 기존 정책들을 모두 삭제합니다.
DROP POLICY IF EXISTS "채팅방 멤버만 채팅방을 볼 수 있음" ON public.chat_rooms;
DROP POLICY IF EXISTS "자신이 속한 멤버십만 접근 가능" ON public.chat_room_members;
DROP POLICY IF EXISTS "멤버 추가/제거" ON public.chat_room_members;
DROP POLICY IF EXISTS "채팅방 멤버만 메시지를 볼 수 있음" ON public.messages;
DROP POLICY IF EXISTS "채팅방 멤버만 메시지를 작성할 수 있음" ON public.messages;

-- 3. 새로 만든 is_room_member 함수를 사용하여 정책을 다시 생성합니다.
-- 이제 테이블 자기 자신을 계속해서 참조하지 않으므로 무한 루프가 발생하지 않습니다.

-- [chat_rooms] 정책
CREATE POLICY "채팅방 멤버만 채팅방을 볼 수 있음" 
ON public.chat_rooms FOR SELECT 
USING (public.is_room_member(id));

-- (채팅방 생성 정책은 기존과 동일)

-- [chat_room_members] 정책
CREATE POLICY "채팅방 멤버 목록 조회" 
ON public.chat_room_members FOR SELECT 
USING (public.is_room_member(room_id));

CREATE POLICY "채팅방에 멤버 추가 가능" 
ON public.chat_room_members FOR INSERT 
WITH CHECK (true);

-- [messages] 정책
CREATE POLICY "채팅방 멤버만 메시지를 볼 수 있음" 
ON public.messages FOR SELECT 
USING (public.is_room_member(room_id));

CREATE POLICY "채팅방 멤버만 메시지를 작성할 수 있음" 
ON public.messages FOR INSERT 
WITH CHECK (public.is_room_member(room_id) AND sender_id = auth.uid());

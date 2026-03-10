-- 1. 채팅방 테이블
CREATE TABLE public.chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. 채팅방 멤버 테이블
CREATE TABLE public.chat_room_members (
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (room_id, user_id)
);

-- 3. 메시지 테이블
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. RLS (Row Level Security) 설정

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 채팅방 멤버만 접근 가능하도록 정책 설정
CREATE POLICY "채팅방 멤버만 채팅방을 볼 수 있음" 
ON public.chat_rooms FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = public.chat_rooms.id AND user_id = auth.uid()));

CREATE POLICY "채팅방 멤버만 채팅방을 생성할 수 있음" 
ON public.chat_rooms FOR INSERT 
WITH CHECK (true); -- 프로젝트 멤버 확인 로직은 프론트/API에서 처리하거나 추가 정책 필요

-- 멤버 자신만 목록을 보거나 추가될 수 있음
CREATE POLICY "자신이 속한 멤버십만 접근 가능" 
ON public.chat_room_members FOR SELECT 
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.chat_room_members crm WHERE crm.room_id = public.chat_room_members.room_id AND crm.user_id = auth.uid()));

CREATE POLICY "멤버 추가/제거" 
ON public.chat_room_members FOR INSERT 
WITH CHECK (true);

-- 메시지는 해당 채팅방 멤버만 읽고 쓸 수 있음
CREATE POLICY "채팅방 멤버만 메시지를 볼 수 있음" 
ON public.messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = public.messages.room_id AND user_id = auth.uid()));

CREATE POLICY "채팅방 멤버만 메시지를 작성할 수 있음" 
ON public.messages FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.chat_room_members WHERE room_id = public.messages.room_id AND user_id = auth.uid()) AND sender_id = auth.uid());

-- Realtime 메시지를 위해 replication 설정 (테이블별로 publish)
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chat_rooms;

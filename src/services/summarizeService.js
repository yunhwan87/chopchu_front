import { supabase } from '../lib/supabase';
import { fetchMessages } from '../api/chat';
import { getLocations, updateLocation } from '../api/locations';
import { toKoreanErrorMessage } from '../utils/errorMessages';

export const setGeminiApiKey = (key) => {
    // Deprecated: API Key is now securely managed by Supabase Edge Functions
    console.warn("setGeminiApiKey is deprecated. API keys are now handled server-side.");
};

// 기존 전체 요약 로직 (혹시 모를 대비용)
export const summarizeChatRoom = async (roomId) => {
    try {
        const messages = await fetchMessages(roomId);
        if (!messages || messages.length === 0) return "요약할 대화 내용이 없습니다.";
        if (messages.length < 3) return "대화 내용이 너무 적어 요약할 필요가 없습니다.";

        const conversationText = messages.map(m => {
            const sender = m.profiles?.nickname || m.profiles?.email?.split('@')[0] || '알 수 없음';
            const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `[${time}] ${sender}: ${m.content}`;
        }).join('\n');

        const prompt = `
다음은 프로젝트 팀원들 간의 채팅 대화 내용입니다. 
대화의 핵심 주제, 결정된 사항, 각자 해야 할 일(Action Item)을 중심으로 3~5줄 이내의 짧고 명확한 한글 요약을 작성해주세요.

[대화 내용]
${conversationText}

[요약]
`;

        const { data, error } = await supabase.functions.invoke('summarize-gemini', {
            body: { prompt }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        return data.text;
    } catch (error) {
        console.error("채팅 요약 실패:", error);
        throw new Error(toKoreanErrorMessage(error, "요약 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요."));
    }
};

/**
 * 특정 날짜 기준(자정 후 1시간 이내 이어진 대화 포함) 채팅 요약
 */
export const summarizeChatByDate = async (roomId, targetDateString) => {
    try {
        const allMessages = await fetchMessages(roomId);
        if (!allMessages || allMessages.length === 0) return "요약할 대화 내용이 없습니다.";

        // 선택된 날짜의 자정시간
        const targetDateStart = new Date(targetDateString);
        targetDateStart.setHours(0, 0, 0, 0);

        const targetDateEnd = new Date(targetDateString);
        targetDateEnd.setHours(23, 59, 59, 999);

        // 자정 넘어서 이어지는 대화를 잡기 위한 임계값 (예: 1시간 = 60 * 60 * 1000 밀리초)
        const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

        // 1. 해당 날짜에 속하는 메시지 필터링
        let sessionMessages = [];
        let lastMessageTime = 0;

        for (let i = 0; i < allMessages.length; i++) {
            const msgTime = new Date(allMessages[i].created_at).getTime();

            // 해당 날짜 안에 있는 메시지
            if (msgTime >= targetDateStart.getTime() && msgTime <= targetDateEnd.getTime()) {
                sessionMessages.push(allMessages[i]);
                lastMessageTime = msgTime;
            }
            // 해당 날짜를 넘어간 다음날 메시지 중, 마지막 메시지와 1시간 이내로 이어진다면 같은 세션으로 봄
            else if (msgTime > targetDateEnd.getTime()) {
                if (sessionMessages.length > 0 && (msgTime - lastMessageTime) <= SESSION_TIMEOUT_MS) {
                    sessionMessages.push(allMessages[i]);
                    lastMessageTime = msgTime; // 이어짐 갱신
                } else if (msgTime > targetDateEnd.getTime()) {
                    // 1시간 초과로 끊겼다면 더 이상 볼 필요 없음
                    break;
                }
            }
        }

        if (sessionMessages.length === 0) return "해당 날짜에 대화 기록이 없습니다.";
        if (sessionMessages.length < 3) return "해당 날짜의 대화 내용이 너무 적어 요약할 필요가 없습니다.";

        const conversationText = sessionMessages.map(m => {
            const sender = m.profiles?.nickname || m.profiles?.email?.split('@')[0] || '알 수 없음';
            const logDate = new Date(m.created_at);
            const timeStr = `${logDate.getMonth() + 1}/${logDate.getDate()} ${logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            return `[${timeStr}] ${sender}: ${m.content}`;
        }).join('\n');

        const prompt = `
다음은 특정 날짜에 진행된 프로젝트 팀원들 간의 채팅 대화 기록입니다. 
당일 대화의 핵심 쟁점, 결정된 사항, 각자 해야 할 일(Action Item)을 중심으로 3~5줄 이내의 짧고 명확한 한글 요약을 작성해주세요.

[선택 날짜: ${targetDateString}]
[대화 내용]
${conversationText}

[요약]
`;

        const { data, error } = await supabase.functions.invoke('summarize-gemini', {
            body: { prompt }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        return data.text;
    } catch (error) {
        console.error("날짜별 채팅 요약 실패:", error);
        throw new Error(toKoreanErrorMessage(error, "요약 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요."));
    }
};

/**
 * 요청(Request) 쓰레드를 요약하고 관련 섭외지(Location) 노트에 추가
 */
export const summarizeRequestToLocation = async (projectId, request, requestMessages) => {
    try {
        if (!requestMessages || requestMessages.length === 0) return { success: false, reason: "대화 내용이 없습니다." };

        // 1. 해당 프로젝트의 장소(섭외지) 목록 가져오기
        const locations = await getLocations(projectId);
        if (!locations || locations.length === 0) return { success: false, reason: "등록된 섭외지가 없습니다." };

        const locationNames = locations.map(l => l.title);
        console.log("1. 조회한 섭외지들:", locationNames);

        // 2. 대화 텍스트 구성
        const conversationText = requestMessages.map(m => {
            const sender = m.sender?.nickname || m.sender?.email?.split('@')[0] || '알 수 없음';
            return `[${sender}]: ${m.content}`;
        }).join('\n');

        // 3. AI 프롬프트 (JSON 응답 요구)
        const prompt = `
다음은 프로젝트 내 특정 업무 요청 쓰레드의 대화 내용입니다.
요청 제목: ${request.title}

[대화 내용]
${conversationText}

현재 이 프로젝트에 등록된 섭외지(Location) 이름 목록은 다음과 같습니다:
[ ${locationNames.join(', ')} ]

지시사항:
1. 대화 내용과 **요청 제목**을 바탕으로, 이 요청이 어떤 섭외지(Location)와 관련된 것인지 위 목록에서 정확히 일치하는 이름을 찾아주세요. 
   - 특히 **요청 제목에 섭외지 이름이 포함되어 있거나 오타/유사어(예: 찹츄장소명 -> 챱츄장소명)로 적혀있더라도, 목록에 있는 정식 이름으로 매핑**해주세요.
   - 만약 관련된 섭외지가 목록에 전혀 없거나 불확실하다면 "None" 이라고 적어주세요.
2. 이 요청이 어떻게 해결되었는지, 주요 결정 사항이나 조치된 내용을 2~3줄로 요약해 주세요.
3. 응답은 반드시 아래 JSON 형식으로만 출력해주세요. 다른 텍스트는 포함하지 마세요.

{
  "target_location": "섭외지 이름 또는 None",
  "summary": "요약 내용"
}
`;
        console.log("2. 구성된 프롬프트:", prompt);

        const { data, error } = await supabase.functions.invoke('summarize-gemini', {
            body: { prompt }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        let textResult = data.text;
        console.log("3. AI 응답 (Raw):", textResult);

        // JSON 파싱을 위해 앞뒤 정리 (마크다운 백틱 등 제거)
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        let aiData;

        try {
            aiData = JSON.parse(textResult);
            console.log("4. 파싱된 AI 결과:", aiData);
        } catch (e) {
            console.error("JSON 파싱 에러:", textResult);
            return { success: false, reason: "AI 응답을 해석할 수 없습니다." };
        }

        if (aiData.target_location === "None") {
            return { success: true, locationName: null, summary: aiData.summary };
        }

        // 4. 일치하는 섭외지 찾기
        const targetLoc = locations.find(l => l.title === aiData.target_location);
        if (!targetLoc) {
            return { success: false, reason: `AI가 '${aiData.target_location}'(을)를 찾았으나 실제 목록에 없습니다.` };
        }

        // 5. 섭외지 요약(request_ai_summary) 업데이트
        const today = new Date().toLocaleDateString('ko-KR');
        const newSummaryEntry = `[${today} 해결된 요청 요약]\n${aiData.summary}`;
        const updatedSummary = targetLoc.request_ai_summary
            ? `${targetLoc.request_ai_summary}\n\n${newSummaryEntry}`
            : newSummaryEntry;

        console.log("5. DB 업데이트 데이터 (Location ID):", targetLoc.id, "Summary:", updatedSummary);

        await updateLocation(targetLoc.id, { request_ai_summary: updatedSummary });

        return {
            success: true,
            locationName: targetLoc.title,
            summary: aiData.summary
        };

    } catch (error) {
        console.error("요청 요약 및 업데이트 실패:", error);
        throw new Error(toKoreanErrorMessage(error, "처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요."));
    }
};

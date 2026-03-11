import { useState, useCallback } from "react";
import { fetchRequests, createRequest, addRequestMessage, updateRequestStatus, fetchRequestMessages } from "../api/requests";
import { toKoreanErrorMessage } from "../utils/errorMessages";

export const useRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadRequests = useCallback(async (projectId, userId, type) => {
        setLoading(true);
        setError(null);
        const { data, error } = await fetchRequests(projectId, userId, type);

        if (error) {
            setError(toKoreanErrorMessage(error, '요청 목록을 불러오지 못했어요.'));
            setRequests([]);
        } else {
            setRequests(data || []);
        }

        setLoading(false);
    }, []);

    const getThread = async (requestId) => {
        return await fetchRequestMessages(requestId);
    };

    const createNewRequest = async (requestData) => {
        setLoading(true);
        const { data, error } = await createRequest(requestData);
        setLoading(false);
        return { data, error: error ? toKoreanErrorMessage(error, '요청 생성에 실패했어요.') : null };
    };

    const replyToRequest = async (requestId, senderId, content) => {
        const { data, error } = await addRequestMessage(requestId, senderId, content);
        return { data, error: error ? toKoreanErrorMessage(error, '답변 등록에 실패했어요.') : null };
    };

    const changeStatus = async (requestId, status) => {
        const { data, error } = await updateRequestStatus(requestId, status);
        if (!error) {
            // 로컬 상태 즉각 반영 (낙관적 업데이트)
            setRequests(prev => prev.map(req => req.id === requestId ? { ...req, status } : req));
        }
        return { data, error: error ? toKoreanErrorMessage(error, '상태 변경에 실패했어요.') : null };
    };

    return {
        requests,
        loading,
        error,
        loadRequests,
        getThread,
        createNewRequest,
        replyToRequest,
        changeStatus,
    };
};

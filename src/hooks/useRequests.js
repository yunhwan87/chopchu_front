import { useState, useCallback } from "react";
import { fetchRequests, createRequest, addRequestMessage, updateRequestStatus, fetchRequestMessages } from "../api/requests";

export const useRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadRequests = useCallback(async (projectId, userId, type) => {
        setLoading(true);
        setError(null);
        const { data, error } = await fetchRequests(projectId, userId, type);

        if (error) {
            setError(error);
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
        return { data, error };
    };

    const replyToRequest = async (requestId, senderId, content) => {
        const { data, error } = await addRequestMessage(requestId, senderId, content);
        return { data, error };
    };

    const changeStatus = async (requestId, status) => {
        const { data, error } = await updateRequestStatus(requestId, status);
        if (!error) {
            // 로컬 상태 즉각 반영 (낙관적 업데이트)
            setRequests(prev => prev.map(req => req.id === requestId ? { ...req, status } : req));
        }
        return { data, error };
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

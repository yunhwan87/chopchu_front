import { useState, useCallback } from 'react';
import * as locationApi from '../api/locations';
import { toKoreanErrorMessage } from '../utils/errorMessages';

export const useLocations = (projectId) => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchLocations = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await locationApi.getLocations(projectId);
            setLocations(data);
        } catch (err) {
            setError(toKoreanErrorMessage(err, '장소 목록을 불러오지 못했어요.'));
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const addLocation = async (locationData, pocs) => {
        setLoading(true);
        setError(null);
        try {
            const newLocation = await locationApi.createLocation(
                { ...locationData, project_id: projectId },
                pocs
            );
            setLocations(prev => [newLocation, ...prev]);
            return { success: true, data: newLocation };
        } catch (err) {
            const message = toKoreanErrorMessage(err, '장소를 등록하지 못했어요.');
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    const updateLocation = async (locationId, updateData, pocs) => {
        setLoading(true);
        setError(null);
        try {
            const updated = await locationApi.updateLocation(locationId, updateData, pocs);
            setLocations(prev => prev.map(l => l.id === locationId ? updated : l));
            return { success: true, data: updated };
        } catch (err) {
            const message = toKoreanErrorMessage(err, '장소를 수정하지 못했어요.');
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    const removeLocation = async (locationId) => {
        setLoading(true);
        setError(null);
        try {
            await locationApi.deleteLocation(locationId);
            setLocations(prev => prev.filter(l => l.id !== locationId));
            return { success: true };
        } catch (err) {
            const message = toKoreanErrorMessage(err, '장소를 삭제하지 못했어요.');
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    return {
        locations,
        loading,
        error,
        fetchLocations,
        addLocation,
        updateLocation,
        removeLocation
    };
};

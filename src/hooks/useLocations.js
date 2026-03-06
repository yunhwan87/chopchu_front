import { useState, useCallback } from 'react';
import * as locationApi from '../api/locations';

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
            setError(err.message);
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
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateLocation = async (locationId, updateData) => {
        setLoading(true);
        setError(null);
        try {
            const updated = await locationApi.updateLocation(locationId, updateData);
            setLocations(prev => prev.map(l => l.id === locationId ? updated : l));
            return { success: true, data: updated };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
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
            setError(err.message);
            return { success: false, error: err.message };
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

import { useState, useEffect } from 'react';
import * as projectsApi from '../api/projects';
import { toKoreanErrorMessage } from '../utils/errorMessages';

export const useProjects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const data = await projectsApi.getProjects();
            setProjects(data);
        } catch (err) {
            setError(toKoreanErrorMessage(err, '프로젝트 목록을 불러오지 못했어요.'));
        } finally {
            setLoading(false);
        }
    };

    const addProject = async (projectData) => {
        setLoading(true);
        try {
            const newProject = await projectsApi.createProject(projectData);
            setProjects(prev => [...prev, newProject]);
            return { success: true, data: newProject };
        } catch (err) {
            const message = toKoreanErrorMessage(err, '프로젝트를 생성하지 못했어요.');
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    const deleteProject = async (projectId) => {
        setLoading(true);
        try {
            await projectsApi.deleteProject(projectId);
            setProjects(prev => prev.filter(p => p.id !== projectId));
            return { success: true };
        } catch (err) {
            const message = toKoreanErrorMessage(err, '프로젝트를 삭제하지 못했어요.');
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    };

    return {
        projects,
        loading,
        error,
        fetchProjects,
        addProject,
        deleteProject,
    };
};

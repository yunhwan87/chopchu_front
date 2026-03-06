import { useState, useEffect } from 'react';
import * as projectsApi from '../api/projects';

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
            setError(err.message);
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
            setError(err.message);
            return { success: false, error: err.message };
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
    };
};

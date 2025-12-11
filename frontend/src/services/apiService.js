// frontend/src/services/apiService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // For cookies
});

// Request interceptor - add token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const { data } = await axios.get(`${API_URL}/auth/refresh`, {
                    withCredentials: true,
                });

                localStorage.setItem('accessToken', data.accessToken);
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed, logout user
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (userData) => apiClient.post('/auth/register', userData),
    login: (credentials) => apiClient.post('/auth/login', credentials),
    logout: () => apiClient.post('/auth/logout'),
    refreshToken: () => apiClient.get('/auth/refresh'),
};

// Ambulances API
export const ambulancesAPI = {
    getAll: () => apiClient.get('/ambulances'),
    getById: (id) => apiClient.get(`/ambulances/${id}`),
    create: (data) => apiClient.post('/ambulances', data),
    update: (id, data) => apiClient.put(`/ambulances/${id}`, data),
    updateLocation: (id, location) =>
        apiClient.patch(`/ambulances/${id}/location`, { location }),
    delete: (id) => apiClient.delete(`/ambulances/${id}`),
};

// Incidents API
export const incidentsAPI = {
    getAll: () => apiClient.get('/incidents'),
    getById: (id) => apiClient.get(`/incidents/${id}`),
    create: (data) => apiClient.post('/incidents', data),
    assign: (id, ambulanceId) =>
        apiClient.post(`/incidents/${id}/assign`, { ambulanceId }),
    complete: (id) => apiClient.patch(`/incidents/${id}/complete`),
    update: (id, data) => apiClient.put(`/incidents/${id}`, data),
    delete: (id) => apiClient.delete(`/incidents/${id}`),
};

export default apiClient;
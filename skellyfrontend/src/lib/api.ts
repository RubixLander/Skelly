// src/lib/api.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', // Ajusta el puerto si es diferente
  withCredentials: true, // Si usas cookies para tokens
});

// Interceptor para añadir el token de acceso a todas las solicitudes
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Header para evitar advertencias de ngrok si es necesario
    config.headers['ngrok-skip-browser-warning'] = 'true';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
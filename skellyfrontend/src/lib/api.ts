import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  withCredentials: true,
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['ngrok-skip-browser-warning'] = 'true';
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ERR_NETWORK') {
      error.message = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
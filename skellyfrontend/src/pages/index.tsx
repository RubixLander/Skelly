// src/pages/index.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SpotifyAuthButton from '../components/SpotifyAuthButton';
import apiClient from '../lib/api';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Verificar parámetros de la URL (callback de autenticación)
        const urlParams = new URLSearchParams(window.location.search);
        const accessTokenFromUrl = urlParams.get('access_token');
        const errorParam = urlParams.get('error');

        if (errorParam) {
          setError('Authentication failed');
          setIsLoading(false);
          return;
        }

        // Si hay token en la URL (callback de autenticación)
        if (accessTokenFromUrl) {
          localStorage.setItem('access_token', accessTokenFromUrl);
          const refreshToken = urlParams.get('refresh_token');
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
          }
          // Limpiar la URL
          window.history.replaceState({}, '', window.location.pathname);
          setIsAuthenticated(true);
          // REDIRECCIÓN INMEDIATA A /PLAYER-TEST
          router.push('/player-test');
          return;
        }

        // Verificar token almacenado en localStorage
        const storedAccessToken = localStorage.getItem('access_token');
        if (storedAccessToken) {
          try {
            // Verificar token con el backend
            const response = await apiClient.get('/spotify/check-auth');
            if (response.data.authenticated) {
              setIsAuthenticated(true);
              // REDIRECCIÓN INMEDIATA A /PLAYER-TEST
              router.push('/player-test');
            } else {
              // Token inválido, limpiar y mostrar botón de autenticación
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              setIsAuthenticated(false);
            }
          } catch (err: any) {
            console.error('Stored token verification failed:', err);
            setError('Failed to verify stored token');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setIsAuthenticated(false);
          }
        } else {
          // No hay token almacenado, mostrar botón de autenticación
          setIsAuthenticated(false);
        }
      } catch (err: any) {
        console.error('Auth check error:', err);
        setError('Authentication check failed');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>SkellyTunes</h1>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>SkellyTunes</h1>
        <p>Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            margin: '10px',
            padding: '10px 20px',
            backgroundColor: '#1DB954',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Si el usuario está autenticado, redirigir a /player-test
  // (Esta comprobación adicional puede ayudar si la redirección inicial falla)
  if (isAuthenticated) {
    router.push('/player-test');
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>SkellyTunes</h1>
        <p>Redirecting to player...</p>
      </div>
    );
  }

  // Si no está autenticado, mostrar el botón de conexión
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>SkellyTunes</h1>
      <div style={{ textAlign: 'center' }}>
        <SpotifyAuthButton />
      </div>
    </div>
  );
}
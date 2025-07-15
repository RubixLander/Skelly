'use client';

import { useEffect, useState } from 'react';
import apiClient from '../lib/api';

export default function Home() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true); // Iniciar carga

      // Verificar si hay un token en la URL de redirección
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      const errorParam = urlParams.get('error');

      if (errorParam) {
        setError('Authentication failed');
        setIsLoading(false);
        return;
      }

      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
        const refreshToken = urlParams.get('refresh_token');
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        window.history.replaceState({}, '', window.location.pathname); // Limpiar parámetros de URL
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Verificar si hay un token en localStorage
      const storedAccessToken = localStorage.getItem('access_token');
      if (storedAccessToken) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // No hay autenticación
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Cargar y manejar SDK de Spotify
  useEffect(() => {
    if (!isAuthenticated) return;

    let player: any = null; // Declarada aquí para acceso en cleanup

    // Definimos window.onSpotifyWebPlaybackSDKReady ANTES de cargar el SDK
    window.onSpotifyWebPlaybackSDKReady = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('No access token found');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      if (!window.Spotify) {
        setError('Spotify SDK not available');
        setIsLoading(false);
        return;
      }

      // Crear el reproductor web de Spotify
      player = new window.Spotify.Player({
        name: 'My Spotify Player',
        getOAuthToken: cb => cb(token),
        volume: 0.5,
      });

      // Escuchar eventos del reproductor
      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID:', device_id);
        setDeviceId(device_id);
        setIsLoading(false);
      });

      player.addListener('authentication_error', ({ message }: { message: string }) => {
        setError(`Auth error: ${message}`);
        setIsAuthenticated(false);
        localStorage.removeItem('access_token');
        setIsLoading(false);
      });

      player.addListener('initialization_error', ({ message }: { message: string }) => {
        setError(`Init error: ${message}`);
        setIsLoading(false);
      });

      player.addListener('playback_error', ({ message }: { message: string }) => {
        setError(`Playback error: ${message}`);
        setIsLoading(false);
      });

      // Conectar al reproductor
      player.connect().then((success: boolean) => {
        if (!success) {
          setError('Failed to connect to Spotify player');
          setIsLoading(false);
        }
      }).catch((connectError: Error) => {
        console.error('Connection error:', connectError);
        setError(`Connection failed: ${connectError.message}`);
        setIsLoading(false);
      });

      // Limpieza del reproductor
      return () => {
        if (player) {
          player.disconnect();
        }
      };
    };

    // Cargar el SDK de Spotify
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js ';
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      // Llamamos a la inicialización desde window.onSpotifyWebPlaybackSDKReady
      if (typeof window.onSpotifyWebPlaybackSDKReady === 'function') {
        window.onSpotifyWebPlaybackSDKReady();
      } else {
        setError('onSpotifyWebPlaybackSDKReady no está definido aún.');
        setIsLoading(false);
      }
    };

    script.onerror = () => {
      setError('Failed to load Spotify player script');
      setIsLoading(false);
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      if (player && player.disconnect) {
        player.disconnect();
      }
      document.body.removeChild(script);
    };
  }, [isAuthenticated]);

  const handleConnect = async () => {
    try {
      const response = await apiClient.post('/spotify/login');
      if (response.data?.url) {
        window.location.href = response.data.url; // Redirige a Spotify
      }
    } catch (error) {
      setError('Failed to connect to Spotify: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsLoading(false);
    }
  };

  const handlePlay = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No access token found');
      if (!deviceId) throw new Error('Device not connected');

      const response = await apiClient.post(
        '/spotify/play',
        {
          uri: 'spotify:track:4vr1YnZEJnCOrk5RbymjFa',
          device_id: deviceId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        }
      );
      console.log('Play response:', response.data);
    } catch (error: any) {
      console.error('Play error:', error);
      let errorMessage = 'Failed to play track';
      if (error.response) {
        errorMessage = error.response.data?.error?.message ||
                      error.response.data?.message ||
                      errorMessage;
      } else if (error.request) {
        errorMessage = 'No response from server';
      } else {
        errorMessage = error.message;
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Spotify Web Player</h1>
        <p>Checking authentication status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>Spotify Web Player</h1>
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

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Spotify Web Player</h1>
      {!isAuthenticated ? (
        <button 
          onClick={handleConnect} 
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
          Connect to Spotify
        </button>
      ) : (
        <>
          <p style={{ margin: '20px 0', fontSize: '18px' }}>
            {deviceId 
              ? 'Connected to Spotify Player' 
              : 'Connecting to Spotify Player...'}
          </p>
          {deviceId && (
            <div>
              <button 
                onClick={handlePlay} 
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
                Play Sample Track
              </button>
              <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                Device ID: {deviceId}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
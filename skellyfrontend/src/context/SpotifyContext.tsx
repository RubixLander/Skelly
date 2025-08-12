// src/context/SpotifyContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import apiClient from '../lib/api';

// Definir tipos para el contexto
export interface PlayerState {
  isPlaying: boolean;
  position: number; // ms
  duration: number; // ms
  trackName: string;
  artistName: string;
  albumImage: string;
  deviceId: string | null;
  contextUri: string | null;
  canSkipNext: boolean;
  canSkipPrevious: boolean;
}

export interface SpotifyContextType {
  deviceId: string | null;
  setDeviceId: React.Dispatch<React.SetStateAction<string | null>>;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  playerState: PlayerState | null;
  setPlayerState: React.Dispatch<React.SetStateAction<PlayerState | null>>;
  playUri: (uri: string) => Promise<void>;
  // Puedes agregar más funciones aquí: pause, next, previous, seek, etc.
}

const initialContextValue: SpotifyContextType = {
  deviceId: null,
  setDeviceId: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  isLoading: true,
  error: null,
  setError: () => {},
  playerState: null,
  setPlayerState: () => {},
  playUri: async () => { throw new Error('SpotifyContext not initialized'); },
};

// Crear el contexto
export const SpotifyContext = createContext<SpotifyContextType>(initialContextValue);

// Proveedor del contexto
export const SpotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);

  // Refs para mantener referencias persistentes
  const playerRef = useRef<any>(null); // Para el SDK de Spotify Web Playback
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Para polling del estado del reproductor

  // Verificar autenticación al montar el proveedor
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get('/spotify/check-auth');
        if (response.data.authenticated) {
          setIsAuthenticated(true);
          // Actualizar tokens en localStorage si el backend los refrescó
          localStorage.setItem('access_token', response.data.accessToken);
          if(response.data.refreshToken) {
            localStorage.setItem('refresh_token', response.data.refreshToken);
          }
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setError('Failed to check authentication status');
        setIsAuthenticated(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Inicializar el SDK de Spotify Web Playback cuando el usuario esté autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    let player: any = null;

    // Definir la función global requerida por el SDK *antes* de cargar el script
    window.onSpotifyWebPlaybackSDKReady = async () => {
       console.log("Spotify SDK is ready");
       initializePlayer();
    };

    // Cargar el script del SDK de Spotify
    const script = document.createElement('script');
    // CORRECCIÓN 1: Eliminar espacio extra al final de la URL
    script.src = 'https://sdk.scdn.co/spotify-player.js'; // <-- Espacio eliminado
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log("Spotify SDK script loaded");
    };
    
    script.onerror = () => {
      setError('Failed to load Spotify player script');
      setIsLoading(false);
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      console.log("SpotifyProvider useEffect - Cleanup");
      if (playerRef.current) {
        console.log("Disconnecting Spotify Player");
        playerRef.current.disconnect();
      }
      if (intervalRef.current) {
        console.log("Clearing polling interval");
        clearInterval(intervalRef.current);
      }
      // CORRECCIÓN 2: Asignar función vacía en lugar de undefined
      if (typeof window !== 'undefined' && window.onSpotifyWebPlaybackSDKReady) {
         window.onSpotifyWebPlaybackSDKReady = () => {}; // <-- Asignar función vacía
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [isAuthenticated]);

  // Inicializar el objeto Spotify.Player
  const initializePlayer = () => {
    console.log("Initializing Spotify Player...");
    if (!(window as any).Spotify) {
      setError('Spotify SDK not available');
      setIsLoading(false);
      return;
    }

    playerRef.current = new (window as any).Spotify.Player({
      name: 'My Spotify Player',
      getOAuthToken: (cb: (token: string) => void) => { // Asignar tipo explícito a cb
        const token = localStorage.getItem('access_token');
        console.log("Getting OAuth token for SDK");
        if (token) {
          cb(token);
        } else {
          console.error("No access token available for SDK");
          setError('No access token available for SDK');
        }
      },
      volume: 0.5
    });

    // Agregar listeners
    playerRef.current.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('Spotify Player Ready. Device ID:', device_id);
      setDeviceId(device_id);
      // Iniciar sondeo del estado del reproductor
      startPlayerStatePolling(device_id);
      setIsLoading(false);
    });

    playerRef.current.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('Device has gone offline', device_id);
      setDeviceId(null);
      setPlayerState(null);
      setError('Device has gone offline');
    });

    playerRef.current.addListener('player_state_changed', (state: any) => {
      console.log('Player State Changed (SDK Listener):', state);
      updatePlayerState(state); // Ya manejado por el polling
    });

    playerRef.current.addListener('authentication_error', ({ message }: { message: string }) => {
      console.error('Spotify Player Auth Error:', message);
      setError(`Spotify Player Auth Error: ${message}`);
      setIsAuthenticated(false);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setDeviceId(null);
      setPlayerState(null);
    });

    playerRef.current.addListener('initialization_error', ({ message }: { message: string }) => {
      console.error('Spotify Player Init Error:', message);
      setError(`Init error: ${message}`);
    });

    playerRef.current.addListener('playback_error', ({ message }: { message: string }) => {
      console.error('Spotify Player Playback Error:', message);
      setError(`Playback error: ${message}`);
    });

    // Conectar el reproductor
    console.log("Connecting to Spotify Player...");
    playerRef.current.connect().then((success: boolean) => {
       if(success) {
          console.log("Successfully connected to Spotify Player");
       } else {
          console.error("Failed to connect to Spotify Player");
          setError('Failed to connect to Spotify Player');
          setIsLoading(false);
       }
    }).catch((connectError: Error) => {
      console.error('Connection error:', connectError);
      setError(`Connection failed: ${connectError.message}`);
      setIsLoading(false);
    });
  };

  // Sondeo del estado del reproductor (alternativa o complemento a player_state_changed)
  const startPlayerStatePolling = (deviceId: string) => {
    stopPlayerStatePolling(); // Limpiar intervalo anterior
    // Polling más frecuente para barra de progreso suave
    intervalRef.current = setInterval(async () => {
      try {
        const response = await apiClient.get('/spotify/current-track');
        updatePlayerState(response.data);
      } catch (err: any) {
        // Manejo silencioso de errores comunes
        if (err.response?.status === 204) {
          // No content - no hay pista activa
          if (playerState !== null) { // Solo actualizar si había una pista antes
             setPlayerState(null);
          }
        } else if (err.response?.status === 401 || err.response?.status === 403) {
          // Token expirado - debería manejarse en check-auth
          console.warn("Token might be expired, handled by check-auth");
        } else {
          console.error('Polling error (not 204/401/403):', err);
        }
      }
    }, 500); // Cada 500ms
  };

  const stopPlayerStatePolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Actualizar el estado del contexto desde el SDK
  const updatePlayerState = (state: any) => {
    if (!state || !state.item) {
      if (playerState !== null) { // Solo actualizar si había una pista antes
         setPlayerState(null);
      }
      return;
    }

    const newPosition = state.progress_ms || 0;
    const newDuration = state.item.duration_ms || 0;
    
    // Lógica precisa para navegación
    const isSkippingNextAllowed = !(state.actions?.disallows?.skipping_next ?? false);
    const isSkippingPrevAllowed = !(state.actions?.disallows?.skipping_prev ?? false);
    const canSkipNext = isSkippingNextAllowed;
    const canSkipPrevious = isSkippingPrevAllowed;

    const newState: PlayerState = {
      isPlaying: state.is_playing,
      position: newPosition,
      duration: newDuration,
      trackName: state.item.name || 'Unknown Track',
      artistName: state.item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      albumImage: state.item.album?.images?.[0]?.url || 'https://via.placeholder.com/300x300?text=No+Image',
      deviceId: deviceId, // Mantener el deviceId
      contextUri: state.context?.uri || null,
      canSkipNext: canSkipNext,
      canSkipPrevious: canSkipPrevious,
    };
    
    setPlayerState(newState);
  };

  // Función para reproducir un URI usando el deviceId del contexto
  const playUri = async (uri: string) => {
    if (!deviceId) {
      throw new Error('No Spotify device connected');
    }
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    try {
      let body;
      if (uri.startsWith('spotify:track:')) {
        body = { uris: [uri], device_id: deviceId };
      } else {
        body = { context_uri: uri, device_id: deviceId };
      }
      await apiClient.post('/spotify/play', body);
    } catch (err: any) {
      console.error('Error playing URI:', err);
      let errorMessage = 'Failed to play item';
      if (err.response) {
        errorMessage = err.response.data?.error?.message || err.response.data?.message || errorMessage;
      } else if (err.request) {
        errorMessage = 'No response from server';
      } else {
        errorMessage = err.message;
      }
      throw new Error(errorMessage);
    }
  };

  // Valor que se proveerá al contexto
  const contextValue: SpotifyContextType = {
    deviceId,
    setDeviceId,
    isAuthenticated,
    setIsAuthenticated,
    isLoading,
    error,
    setError,
    playerState,
    setPlayerState,
    playUri,
    // Aquí puedes añadir más funciones como pause, next, etc.
  };

  return (
    <SpotifyContext.Provider value={contextValue}>
      {children}
    </SpotifyContext.Provider>
  );
};
// src/components/SpotifyPlayer.tsx
import React, { useContext, useEffect, useState, useRef } from 'react';
import { SpotifyContext } from '../context/SpotifyContext';
import apiClient from '../lib/api';

const SpotifyPlayer: React.FC = () => {
  const context = useContext(SpotifyContext);

  if (!context) {
    throw new Error('SpotifyPlayer must be used within a SpotifyProvider');
  }

  const { deviceId, playerState, setPlayerState, error: contextError, setError: setContextError } = context;

  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Combinar errores del contexto y locales
  const displayError = contextError || localError;

  // Limpiar errores locales cuando el contexto tenga un error
  useEffect(() => {
    if (localError) {
      setLocalError(null);
    }
  }, [contextError]);

  // Simular carga inicial (puedes eliminar esto si no es necesario)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Simular 1 segundo de carga

    return () => clearTimeout(timer);
  }, []);

  // Formatear milisegundos a mm:ss
  const formatTime = (ms: number): string => {
    if (isNaN(ms) || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Manejar cambio en la barra de progreso (seek)
  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseInt(e.target.value, 10);
    console.log(`Seeking to ${newPosition}ms`);
    
    // Actualizar UI inmediatamente para feedback visual
    if (playerState) {
       setPlayerState({ ...playerState, position: newPosition });
    }
    
    // Enviar comando de seek a Spotify
    if (deviceId) {
      try {
        // Usar el endpoint PUT /spotify/seek con cuerpo en JSON
        await apiClient.put(`/spotify/seek`, {
          position_ms: newPosition,
          device_id: deviceId
        });
        console.log("Seek successful");
        // No necesitamos actualizar el estado aquí, el polling lo hará
      } catch (err: any) {
        console.error('Seek error:', err);
        // Revertir el cambio en la UI si falla
        // El polling debería corregir el estado eventualmente
        setLocalError('Failed to seek track: ' + (err.response?.data?.message || err.message));
      }
    } else {
       console.error("Cannot seek: No device ID");
       setLocalError('Cannot seek: No device connected');
    }
  };

  // Reproducir/Pausar - Corregido
  const togglePlay = async () => {
    console.log("Toggling play/pause");
    
    try {
      if (!deviceId) {
         console.error("Cannot toggle play: No device ID");
         setLocalError('No device connected');
         return; // Salir temprano
      }
      
      if (playerState?.isPlaying) {
        console.log("Pausing track");
        await apiClient.post('/spotify/pause');
        // Actualizar estado local inmediatamente
        if (playerState) {
           setPlayerState({ ...playerState, isPlaying: false });
        }
      } else {
        console.log("Playing/resuming track");
        // Para reanudar, llamamos a /spotify/play sin uris ni context_uri
        // Esto debería reanudar la reproducción pausada en el mismo dispositivo
        await apiClient.post('/spotify/play', 
          { device_id: deviceId }
        );
        // Actualizar estado local inmediatamente
        if (playerState) {
           setPlayerState({ ...playerState, isPlaying: true });
        }
      }
    } catch (err: any) {
      console.error('Toggle play error:', err);
      setLocalError('Failed to toggle play/pause: ' + (err.response?.data?.message || err.message));
    }
  };

  // Siguiente pista - CORREGIDO
  const nextTrack = async () => {
    console.log("Playing next track");
    
    // CORRECCIÓN: Verificar si la acción está permitida PARA ESTA PISTA
    if (!playerState?.canSkipNext) {
        console.warn("Cannot play next: Action disallowed by Spotify API for this track/context");
        // Opcional: mostrar mensaje al usuario
        return;
    }
    
    if (!deviceId) {
       console.error("Cannot play next: No device ID");
       setLocalError('Cannot play next: No device connected');
       return;
    }
    try {
      await apiClient.post('/spotify/next-track', 
        { device_id: deviceId }
      );
      // El estado se actualizará automáticamente por el polling
      console.log("Next track requested");
    } catch (err: any) {
      console.error('Next track error:', err);
      setLocalError('Failed to play next track: ' + (err.response?.data?.message || err.message));
    }
  };

  // Pista anterior - CORREGIDO
  const previousTrack = async () => {
    console.log("Playing previous track");
    
    // CORRECCIÓN: Verificar si la acción está permitida PARA ESTA PISTA
    if (!playerState?.canSkipPrevious) {
        console.warn("Cannot play previous: Action disallowed by Spotify API for this track/context");
        // Opcional: mostrar mensaje al usuario
        return;
    }
    
    if (!deviceId) {
       console.error("Cannot play previous: No device ID");
       setLocalError('Cannot play previous: No device connected');
       return;
    }
    try {
      await apiClient.post('/spotify/previous-track', 
        { device_id: deviceId }
      );
      // El estado se actualizará automáticamente por el polling
      console.log("Previous track requested");
    } catch (err: any) {
      console.error('Previous track error:', err);
      setLocalError('Failed to play previous track: ' + (err.response?.data?.message || err.message));
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '10px', textAlign: 'center' }}>
        <p>Initializing Spotify player...</p>
      </div>
    );
  }

  // Mostrar errores si los hay, incluso sin pista
  if (displayError && !playerState) {
      return (
        <div style={{ padding: '10px', textAlign: 'center', color: 'red' }}>
          <p>Error: {displayError}</p>
          <button onClick={() => {
            if (setContextError) setContextError(null);
            setLocalError(null);
          }} style={{ marginLeft: '10px' }}>
            Clear
          </button>
        </div>
      );
  }

  // CORRECCIÓN 2: Mostrar el reproductor si hay deviceId, incluso si no hay pista activa
  // Esto evita que desaparezca al reproducir una canción
  if (!deviceId) {
      return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#282828',
      color: 'white',
      padding: '10px',
      borderTop: '1px solid #404040',
      zIndex: 1000
    }}>
    
     {/* Mostrar error si lo hay, pero mantener el reproductor */}
     {displayError && (
       <div style={{ color: 'red', marginBottom: '5px', textAlign: 'center' }}>
         <small>Error: {displayError}</small>
         <button 
           onClick={() => {
             if (setContextError) setContextError(null);
             setLocalError(null);
           }} 
           style={{ 
             marginLeft: '10px', 
             background: 'none', 
             border: '1px solid #ccc', 
             color: 'white', 
             padding: '2px 5px', 
             cursor: 'pointer',
             fontSize: '10px'
           }}
         >
           X
         </button>
       </div>
     )}
    
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Información de la pista */}
        <div style={{ display: 'flex', alignItems: 'center', width: '30%' }}>
          <img 
            src={playerState?.albumImage || 'https://via.placeholder.com/300x300?text=No+Image'} 
            alt="Album cover" 
            style={{ width: '56px', height: '56px', marginRight: '10px' }}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=No+Image'; }}
          />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{playerState?.trackName || 'No track playing'}</div>
            <div style={{ fontSize: '12px', color: '#b3b3b3' }}>{playerState?.artistName || ''}</div>
          </div>
        </div>

        {/* Controles */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            {/* Botón Anterior - USAR canSkipPrevious */}
            <button 
              onClick={previousTrack}
              disabled={!playerState?.canSkipPrevious} // Deshabilitar si no se puede navegar
              aria-label="Previous track"
              style={{
                background: 'none',
                border: 'none',
                color: playerState?.canSkipPrevious ? 'white' : '#555', // Cambiar color si está deshabilitado
                fontSize: '16px',
                cursor: playerState?.canSkipPrevious ? 'pointer' : 'not-allowed',
                padding: '5px'
              }}
            >
              ⏮
            </button>
            {/* Botón Play/Pausa */}
            <button 
              onClick={togglePlay}
              aria-label={playerState?.isPlaying ? "Pause" : "Play"}
              style={{
                background: 'white',
                color: 'black',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 15px',
                cursor: 'pointer'
              }}
            >
              {playerState?.isPlaying ? '⏸' : '▶'}
            </button>
            {/* Botón Siguiente - USAR canSkipNext */}
            <button 
              onClick={nextTrack}
              disabled={!playerState?.canSkipNext} // Deshabilitar si no se puede navegar
              aria-label="Next track"
              style={{
                background: 'none',
                border: 'none',
                color: playerState?.canSkipNext ? 'white' : '#555', // Cambiar color si está deshabilitado
                fontSize: '16px',
                cursor: playerState?.canSkipNext ? 'pointer' : 'not-allowed',
                padding: '5px'
              }}
            >
              ⏭
            </button>
          </div>
          
          {/* Barra de progreso */}
          <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', marginRight: '5px', color: '#b3b3b3' }}>
              {formatTime(playerState?.position || 0)}
            </span>
            <input
              type="range"
              min="0"
              max={playerState?.duration || 100}
              value={playerState?.position || 0}
              onChange={handleSeek}
              aria-label="Seek track"
              style={{
                flex: 1,
                height: '4px',
                backgroundColor: '#535353',
                appearance: 'none',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '12px', marginLeft: '5px', color: '#b3b3b3' }}>
              {formatTime(playerState?.duration || 0)}
            </span>
          </div>
        </div>

        {/* Espacio vacío para equilibrar */}
        <div style={{ width: '30%' }}></div>
      </div>
    </div>
  );
};

export default SpotifyPlayer;
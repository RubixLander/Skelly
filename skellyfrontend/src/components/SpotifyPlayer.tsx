import React, { useContext, useEffect, useState } from 'react';
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

  const displayError = contextError || localError;

  useEffect(() => {
    if (localError) {
      setLocalError(null);
    }
  }, [contextError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const formatTime = (ms: number): string => {
    if (isNaN(ms) || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseInt(e.target.value, 10);
    if (playerState) setPlayerState({ ...playerState, position: newPosition });

    if (deviceId) {
      try {
        await apiClient.put(`/spotify/seek`, {
          position_ms: newPosition,
          device_id: deviceId
        });
      } catch (err: any) {
        setLocalError('Failed to seek track: ' + (err.response?.data?.message || err.message));
      }
    } else {
      setLocalError('Cannot seek: No device connected');
    }
  };

  const togglePlay = async () => {
    try {
      if (!deviceId) {
        setLocalError('No device connected');
        return;
      }

      if (playerState?.isPlaying) {
        await apiClient.post('/spotify/pause');
        if (playerState) setPlayerState({ ...playerState, isPlaying: false });
      } else {
        await apiClient.post('/spotify/play', { device_id: deviceId });
        if (playerState) setPlayerState({ ...playerState, isPlaying: true });
      }
    } catch (err: any) {
      setLocalError('Failed to toggle play/pause: ' + (err.response?.data?.message || err.message));
    }
  };

  const nextTrack = async () => {
    if (!playerState?.canSkipNext) return;
    if (!deviceId) {
      setLocalError('Cannot play next: No device connected');
      return;
    }
    try {
      await apiClient.post('/spotify/next-track', { device_id: deviceId });
    } catch (err: any) {
      setLocalError('Failed to play next track: ' + (err.response?.data?.message || err.message));
    }
  };

  const previousTrack = async () => {
    if (!playerState?.canSkipPrevious) return;
    if (!deviceId) {
      setLocalError('Cannot play previous: No device connected');
      return;
    }
    try {
      await apiClient.post('/spotify/previous-track', { device_id: deviceId });
    } catch (err: any) {
      setLocalError('Failed to play previous track: ' + (err.response?.data?.message || err.message));
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '10px', textAlign: 'center' }}>
      </div>
    );
  }

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

  if (!deviceId || !playerState || !playerState.trackName) {
    return null;
  }

  return (
    <div 
      className="spotify-player"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#282828',
        color: 'white',
        padding: '10px 15px',
        borderTop: '1px solid #404040',
        zIndex: 1000,
        boxSizing: 'border-box'
      }}
    >
      {displayError && (
        <div style={{ color: 'red', marginBottom: '8px', textAlign: 'center' }}>
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
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: '10px',
              borderRadius: '3px'
            }}
          >
            X
          </button>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Columna izquierda: Información de la pista */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: '150px',
          justifyContent: 'flex-start'
        }}>
          <img
            src={playerState?.albumImage || 'https://via.placeholder.com/300x300?text=No+Image'}
            alt="Album cover"
            style={{
              width: '50px',
              height: '50px',
              marginRight: '10px',
              borderRadius: '4px'
            }}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=No+Image'; }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 'bold',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {playerState?.trackName || 'No track playing'}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#b3b3b3',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {playerState?.artistName || ''}
            </div>
          </div>
        </div>

        {/* Columna central: Controles */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          minWidth: '200px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px',
            gap: '12px'
          }}>
            <button onClick={previousTrack} disabled={!playerState?.canSkipPrevious}
              aria-label="Previous track"
              style={{
                background: 'none',
                border: 'none',
                color: playerState?.canSkipPrevious ? 'white' : '#555',
                fontSize: '16px',
                cursor: playerState?.canSkipPrevious ? 'pointer' : 'not-allowed',
                padding: '5px',
                opacity: playerState?.canSkipPrevious ? 1 : 0.5
              }}>
              ⏮
            </button>
            <button onClick={togglePlay}
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
                margin: '0 12px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
              {playerState?.isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={nextTrack} disabled={!playerState?.canSkipNext}
              aria-label="Next track"
              style={{
                background: 'none',
                border: 'none',
                color: playerState?.canSkipNext ? 'white' : '#555',
                fontSize: '16px',
                cursor: playerState?.canSkipNext ? 'pointer' : 'not-allowed',
                padding: '5px',
                opacity: playerState?.canSkipNext ? 1 : 0.5
              }}>
              ⏭
            </button>
          </div>

          {/* Barra de progreso */}
          <div style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <span style={{
              fontSize: '12px',
              color: '#b3b3b3',
              minWidth: '35px',
              textAlign: 'right'
            }}>
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
                cursor: 'pointer',
                borderRadius: '2px'
              }}
            />
            <span style={{
              fontSize: '12px',
              color: '#b3b3b3',
              minWidth: '35px'
            }}>
              {formatTime(playerState?.duration || 0)}
            </span>
          </div>
        </div>

        {/* Columna derecha (reservada para volumen u opciones futuras) */}
        <div style={{
          flex: 1,
          minWidth: '150px',
          justifyContent: 'flex-end',
          display: 'flex'
        }}>
          {/* aquí puedes poner volumen u otras opciones más adelante */}
        </div>
      </div>
    </div>
  );
};

export default SpotifyPlayer;

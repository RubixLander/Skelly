// src/components/SpotifyAuthButton.tsx
import React from 'react';
import apiClient from '../lib/api';

interface SpotifyAuthButtonProps {
  onConnect?: () => void; // Opcional: callback cuando se conecta
}

const SpotifyAuthButton: React.FC<SpotifyAuthButtonProps> = ({ onConnect }) => {
  const handleConnect = async () => {
    try {
      const response = await apiClient.post('/spotify/login');
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error al conectar con Spotify:', error);
      // Manejar error de conexión (mostrar mensaje al usuario, etc.)
    }
  };

  return (
    <button
      onClick={handleConnect}
      style={{
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
  );
};

export default SpotifyAuthButton;
/**
 * Componente principal de la página de prueba del reproductor.
 * 
 * Este componente gestiona la autenticación con Spotify, la búsqueda de contenido,
 * la visualización de resultados y la integración con el reproductor de Spotify.
 * 
 * @remarks
 * - Requiere que el contexto de Spotify esté disponible a través de SpotifyProvider
 * - Redirige automáticamente a la página de inicio si el usuario no está autenticado
 * - Integra el componente SearchResults para mostrar resultados de búsqueda formateados
 * - Muestra el reproductor de Spotify en la parte inferior cuando hay un dispositivo conectado
 * 
 * @example
 * ```tsx
 * // En _app.tsx
 * <SpotifyProvider>
 *   <PlayerTestPage />
 * </SpotifyProvider>
 * ```
 */
import React, { useContext, useState } from 'react';
import { useRouter } from 'next/router';
import { SpotifyContext } from '../context/SpotifyContext';
import SpotifyAuthButton from '../components/SpotifyAuthButton';
import SpotifyPlayer from '../components/SpotifyPlayer';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import apiClient from '../lib/api';
import { SearchResult } from '../types/spotify-types';

const PlayerTestPage: React.FC = () => {
  // Hook de navegación de Next.js
  const router = useRouter();
  
  // Obtener contexto de Spotify - contiene estado del reproductor, autenticación, etc.
  const context = useContext(SpotifyContext);

  // Verificación de seguridad: el contexto debe estar disponible
  if (!context) {
    throw new Error('PlayerTestPage must be used within a SpotifyProvider');
  }

  // Extraer valores relevantes del contexto de Spotify
  const { deviceId, isAuthenticated, isLoading, error: contextError, playUri } = context;

  // Estado local para manejar resultados de búsqueda
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  /**
   * Efecto para redirigir al usuario a la página de inicio si no está autenticado
   * Se ejecuta cuando cambian los estados de autenticación o carga
   */
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  /**
   * Maneja la búsqueda de contenido en Spotify
   * 
   * @param query - Término de búsqueda ingresado por el usuario
   * 
   * @remarks
   * - Realiza una llamada a la API de Spotify a través del backend
   * - Limita los resultados a 50 items por categoría
   * - Maneja estados de carga y errores
   */
  const handleSearch = async (query: string) => {
    // Validación básica: no buscar si la consulta está vacía
    if (!query.trim()) return;
    
    // Iniciar estado de búsqueda
    setIsSearching(true);
    setLocalError(null);

    try {
      // Realizar búsqueda a través del backend (proxy para la API de Spotify)
      const response = await apiClient.get(`/spotify/search?q=${encodeURIComponent(query)}&limit=50`);
      setSearchResults(response.data);
    } catch (err: any) {
      // Manejo de errores: registrar en consola y mostrar al usuario
      console.error('Search error:', err);
      setLocalError(err.response?.data?.message || err.message || 'Search failed');
      setSearchResults(null);
    } finally {
      // Finalizar estado de búsqueda independientemente del resultado
      setIsSearching(false);
    }
  };

  /**
   * Maneja la reproducción de un URI específico usando el contexto de Spotify
   * 
   * @param uri - URI de Spotify (track, album, artist, playlist)
   * 
   * @remarks
   * - Delega la lógica de reproducción al contexto de Spotify
   * - Maneja errores de reproducción
   */
  const handlePlayUri = async (uri: string) => {
    try {
      // Usar función del contexto para reproducir el URI
      await playUri(uri);
    } catch (err: any) {
      // Manejo de errores de reproducción
      console.error('Play error:', err);
      setLocalError(err.message || 'Failed to play item');
    }
  };

  // Renderizado condicional durante la carga inicial
  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>SkellyTunes</h1>
        <p>Checking authentication and initializing player...</p>
      </div>
    );
  }

  // Renderizado condicional si hay error en el contexto de Spotify
  if (contextError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>SkellyTunes</h1>
        <p>Error: {contextError}</p>
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

  // Renderizado condicional si el usuario no está autenticado
  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>SkellyTunes</h1>
        <p>You are not authenticated.</p>
        <SpotifyAuthButton />
      </div>
    );
  }

  // Renderizado principal cuando todo está correctamente configurado
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', paddingBottom: '100px' }}>
      <h1 style={{ textAlign: 'center' }}>SkellyTunes</h1>

      {/* Barra de búsqueda centrada */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Mostrar errores de búsqueda si existen */}
      {localError && (
        <div style={{ color: 'red', textAlign: 'center', marginBottom: '20px' }}>
          Error: {localError}
          <button 
            onClick={() => setLocalError(null)} 
            style={{ marginLeft: '10px' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Componente de resultados de búsqueda - delega la presentación */}
      <SearchResults 
        searchResults={searchResults}
        isSearching={isSearching}
        onPlayUri={handlePlayUri}
      />

      {/* Reproductor de Spotify - solo se muestra si hay dispositivo conectado */}
      {deviceId && <SpotifyPlayer />}
    </div>
  );
};

export default PlayerTestPage;
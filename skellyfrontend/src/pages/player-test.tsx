// src/pages/player-test.tsx
import React, { useContext, useState } from 'react';
import { useRouter } from 'next/router';
import { SpotifyContext } from '../context/SpotifyContext';
import SpotifyAuthButton from '../components/SpotifyAuthButton';
import SpotifyPlayer from '../components/SpotifyPlayer';
import SearchBar from '../components/SearchBar';
import apiClient from '../lib/api';
import { SearchResult } from '../types/spotify-types';

const PlayerTestPage: React.FC = () => {
  const router = useRouter();
  const context = useContext(SpotifyContext);

  if (!context) {
    throw new Error('PlayerTestPage must be used within a SpotifyProvider');
  }

  const { deviceId, isAuthenticated, isLoading, error: contextError, playUri } = context;

  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Redirigir si no está autenticado
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setLocalError(null);

    try {
      const response = await apiClient.get(`/spotify/search?q=${encodeURIComponent(query)}&limit=50`);
      setSearchResults(response.data);
    } catch (err: any) {
      console.error('Search error:', err);
      setLocalError(err.response?.data?.message || err.message || 'Search failed');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Función para reproducir un URI usando el contexto
  const handlePlayUri = async (uri: string) => {
    try {
      await playUri(uri); // Usar la función del contexto
      // alert('Reproduciendo...'); // Opcional: feedback visual
    } catch (err: any) {
      console.error('Play error:', err);
      setLocalError(err.message || 'Failed to play item');
    }
  };

  // Función para obtener la URL de la imagen
  const getImageUrl = (item: any, type: 'track' | 'album' | 'artist' | 'playlist'): string => {
    try {
      if (type === 'track' && item.album && Array.isArray(item.album.images) && item.album.images.length > 0) {
        return item.album.images[0]?.url || 'https://via.placeholder.com/300x300?text=No+Image';
      }
      if ((type === 'album' || type === 'playlist' || type === 'artist') && Array.isArray(item.images) && item.images.length > 0) {
        return item.images[0]?.url || 'https://via.placeholder.com/300x300?text=No+Image';
      }
    } catch (e) {
      console.warn('Error getting image URL for item:', item, type, e);
    }
    return 'https://via.placeholder.com/300x300?text=No+Image';
  };

  // Función para obtener los nombres de los artistas
  const getArtistNames = (item: any): string => {
    if (!item) return 'Desconocido';
    if (item.artists && Array.isArray(item.artists) && item.artists.length > 0) {
      return item.artists
        .filter((artist: any) => artist && artist.name) // Filtrar artistas nulos y sin nombre
        .map((artist: any) => artist.name)
        .join(', ');
    }
    return 'Desconocido';
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Player Test Page</h1>
        <p>Checking authentication and initializing player...</p>
      </div>
    );
  }

  if (contextError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>Player Test Page</h1>
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

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Player Test Page</h1>
        <p>You are not authenticated.</p>
        <SpotifyAuthButton />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', paddingBottom: '100px' }}>
      <h1 style={{ textAlign: 'center' }}>Player Test Page</h1>

      {/* Barra de búsqueda */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Mostrar errores */}
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

      {/* Mostrar resultados de búsqueda */}
      {isSearching && <p style={{ textAlign: 'center' }}>Buscando...</p>}
      
      {searchResults && !isSearching && (
        <div>
          {/* Canciones */}
          {searchResults.tracks && searchResults.tracks.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2>Canciones</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                {searchResults.tracks.filter(track => track !== null).map((track) => (
                  <div key={track.id} style={{ width: '150px', textAlign: 'center' }}>
                    <img
                      src={getImageUrl(track, 'track')}
                      alt={track.name || 'Unknown Track'}
                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=No+Image'; }}
                    />
                    <p style={{ fontWeight: 'bold', margin: '5px 0 0 0' }}>{track.name || 'Unknown Track'}</p>
                    <p style={{ fontSize: '14px', color: '#666', margin: '2px 0' }}>{getArtistNames(track)}</p>
                    <button
                      onClick={() => track.uri && handlePlayUri(track.uri)}
                      disabled={!track.uri} // Deshabilitar si no hay URI
                      style={{
                        marginTop: '5px',
                        padding: '5px 10px',
                        backgroundColor: track.uri ? '#1DB954' : '#ccc', // Cambiar color si está deshabilitado
                        color: 'white',
                        border: 'none',
                        borderRadius: '15px',
                        cursor: track.uri ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      Reproducir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Álbumes */}
          {searchResults.albums && searchResults.albums.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2>Álbumes</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                 {searchResults.albums.filter(album => album !== null).map((album) => (
                  <div key={album.id} style={{ width: '150px', textAlign: 'center' }}>
                    <img
                      src={getImageUrl(album, 'album')}
                      alt={album.name || 'Unknown Album'}
                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=No+Image'; }}
                    />
                    <p style={{ fontWeight: 'bold', margin: '5px 0 0 0' }}>{album.name || 'Unknown Album'}</p>
                    <p style={{ fontSize: '14px', color: '#666', margin: '2px 0' }}>{getArtistNames(album)}</p>
                    <button
                      onClick={() => album.uri && handlePlayUri(album.uri)}
                      disabled={!album.uri}
                      style={{
                        marginTop: '5px',
                        padding: '5px 10px',
                        backgroundColor: album.uri ? '#1DB954' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '15px',
                        cursor: album.uri ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      Reproducir Álbum
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artistas */}
          {searchResults.artists && searchResults.artists.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2>Artistas</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                 {searchResults.artists.filter(artist => artist !== null).map((artist) => (
                  <div key={artist.id} style={{ width: '150px', textAlign: 'center' }}>
                    <img
                      src={getImageUrl(artist, 'artist')}
                      alt={artist.name || 'Unknown Artist'}
                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=No+Image'; }}
                    />
                    <p style={{ fontWeight: 'bold', margin: '5px 0 0 0' }}>{artist.name || 'Unknown Artist'}</p>
                    <button
                      onClick={() => artist.uri && handlePlayUri(artist.uri)}
                      disabled={!artist.uri}
                      style={{
                        marginTop: '5px',
                        padding: '5px 10px',
                        backgroundColor: artist.uri ? '#1DB954' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '15px',
                        cursor: artist.uri ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      Reproducir Top Tracks
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playlists */}
          {searchResults.playlists && searchResults.playlists.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2>Playlists</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                 {searchResults.playlists.filter(playlist => playlist !== null).map((playlist) => (
                  <div key={playlist.id} style={{ width: '150px', textAlign: 'center' }}>
                    <img
                      src={getImageUrl(playlist, 'playlist')}
                      alt={playlist.name || 'Unknown Playlist'}
                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=No+Image'; }}
                    />
                    <p style={{ fontWeight: 'bold', margin: '5px 0 0 0' }}>{playlist.name || 'Unknown Playlist'}</p>
                    <p style={{ fontSize: '14px', color: '#666', margin: '2px 0' }}>
                      Por {playlist.owner?.display_name || 'Desconocido'}
                    </p>
                    <button
                      onClick={() => playlist.uri && handlePlayUri(playlist.uri)}
                      disabled={!playlist.uri}
                      style={{
                        marginTop: '5px',
                        padding: '5px 10px',
                        backgroundColor: playlist.uri ? '#1DB954' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '15px',
                        cursor: playlist.uri ? 'pointer' : 'not-allowed',
                        fontSize: '12px'
                      }}
                    >
                      Reproducir Playlist
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reproductor en la parte inferior */}
      {/* CORRECCIÓN: Mostrar siempre que haya deviceId */}
      {deviceId && <SpotifyPlayer />}
    </div>
  );
};

export default PlayerTestPage;
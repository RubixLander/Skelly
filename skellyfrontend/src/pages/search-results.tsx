import React, { useEffect, useState } from 'react';
import apiClient from '../lib/api';
import SearchBar from '../components/SearchBar';
import { SpotifyTrack, SpotifyAlbum, SpotifyArtist, SpotifyPlaylist, SearchResult } from '../types/spotify-types';

const SearchResults: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError(null);

    try {
      const response = await apiClient.get(`/spotify/search?q=${encodeURIComponent(searchQuery)}&limit=50`);
      setSearchResults(response.data);
    } catch (error: any) {
      console.error('Search error:', error);
      setError(error.response?.data?.message || error.message || 'Search failed');
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>Resultados de Búsqueda</h1>
      <SearchBar onSearch={handleSearch} />
      {error && (
        <div style={{ color: 'red', textAlign: 'center', marginBottom: '20px' }}>
          Error en búsqueda: {error}
        </div>
      )}
      {searchResults && (
        <div>
          {/* Canciones */}
          {searchResults.tracks.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2>Canciones</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                {searchResults.tracks.map((track) => (
                  <div key={track.id} style={{ width: '150px', textAlign: 'center' }}>
                    <img
                      src={track.album?.images[0]?.url || '/placeholder-image.png'}
                      alt={track.name}
                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <p style={{ fontWeight: 'bold', margin: '5px 0 0 0' }}>{track.name}</p>
                    <p style={{ fontSize: '14px', color: '#666', margin: '2px 0' }}>
                      {track.artists?.map((artist) => artist.name).join(', ') || 'Desconocido'}
                    </p>
                    <button
                      onClick={() => alert(`Reproducir ${track.name}`)}
                      style={{
                        marginTop: '5px',
                        padding: '5px 10px',
                        backgroundColor: '#1DB954',
                        color: 'white',
                        border: 'none',
                        borderRadius: '15px',
                        cursor: 'pointer',
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
          {searchResults.albums.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2>Álbumes</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                {searchResults.albums.map((album) => (
                  <div key={album.id} style={{ width: '150px', textAlign: 'center' }}>
                    <img
                      src={album.images[0]?.url || '/placeholder-image.png'}
                      alt={album.name}
                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <p style={{ fontWeight: 'bold', margin: '5px 0 0 0' }}>{album.name}</p>
                    <p style={{ fontSize: '14px', color: '#666', margin: '2px 0' }}>
                      {album.artists?.map((artist) => artist.name).join(', ') || 'Desconocido'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artistas */}
          {searchResults.artists.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2>Artistas</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                {searchResults.artists.map((artist) => (
                  <div key={artist.id} style={{ width: '150px', textAlign: 'center' }}>
                    <img
                      src={artist.images[0]?.url || '/placeholder-image.png'}
                      alt={artist.name}
                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <p style={{ fontWeight: 'bold', margin: '5px 0 0 0' }}>{artist.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playlists */}
          {searchResults.playlists.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h2>Playlists</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                {searchResults.playlists.map((playlist) => (
                  <div key={playlist.id} style={{ width: '150px', textAlign: 'center' }}>
                    <img
                      src={playlist.images[0]?.url || '/placeholder-image.png'}
                      alt={playlist.name}
                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <p style={{ fontWeight: 'bold', margin: '5px 0 0 0' }}>{playlist.name}</p>
                    <p style={{ fontSize: '14px', color: '#666', margin: '2px 0' }}>
                      Por {playlist.owner.display_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
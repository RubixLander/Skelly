import React, { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { SpotifyTrack, SpotifyAlbum, SpotifyArtist, SpotifyPlaylist } from '../types/spotify-types';

interface ItemDetailsProps {
  item: SpotifyArtist | SpotifyAlbum | SpotifyPlaylist;
  itemType: 'artist' | 'album' | 'playlist';
  onPlayUri: (uri: string) => void;
  onBack: () => void;
}

const ItemDetails: React.FC<ItemDetailsProps> = ({ item, itemType, onPlayUri, onBack }) => {
  const [details, setDetails] = useState<any>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [albumTracks, setAlbumTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let response;
        switch (itemType) {
          case 'artist':
            response = await apiClient.get(`/spotify/artist/${item.id}/top-tracks`);
            break;
          case 'album':
            response = await apiClient.get(`/spotify/album/${item.id}/tracks`);
            break;
          case 'playlist':
            response = await apiClient.get(`/spotify/playlist/${item.id}/tracks`);
            break;
          default:
            throw new Error('Tipo de ítem no soportado');
        }
        setDetails(response.data);
      } catch (err: any) {
        console.error('Error fetching details:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load details');
      } finally {
        setIsLoading(false);
      }
    };

    // Si es un artista, también obtiene sus álbumes
    if (itemType === 'artist') {
      const fetchAlbums = async () => {
        try {
          const response = await apiClient.get(`/spotify/artist/${item.id}/albums`);
          setAlbums(response.data.items || []);
        } catch (err) {
          console.error('Error fetching albums:', err);
        }
      };
      fetchAlbums();
    }

    fetchDetails();
  }, [item.id, itemType]);

  // Función para obtener las canciones de un álbum
  const fetchAlbumTracks = async (albumId: string) => {
    try {
      const response = await apiClient.get(`/spotify/album/${albumId}/tracks`);
      setAlbumTracks(response.data.items || []);
    } catch (err) {
      console.error('Error fetching album tracks:', err);
    }
  };

  // Función para obtener la imagen del track
  const getImageUrl = (itemData: any, type: 'track' | 'album' | 'artist' | 'playlist'): string => {
    try {
      if (type === 'track') {
        // Para tracks, la imagen viene del álbum
        if (itemData.album && Array.isArray(itemData.album.images) && itemData.album.images.length > 0) {
          return itemData.album.images[0]?.url || 'https://via.placeholder.com/300x300?text=No+Image';
        }
        return 'https://via.placeholder.com/300x300?text=No+Image';
      }
      
      if ((type === 'album' || type === 'playlist' || type === 'artist') && Array.isArray(itemData.images) && itemData.images.length > 0) {
        return itemData.images[0]?.url || 'https://via.placeholder.com/300x300?text=No+Image';
      }
    } catch (e) {
      console.warn('Error getting image URL for item:', itemData, type, e);
    }
    return 'https://via.placeholder.com/300x300?text=No+Image';
  };

  // Función para obtener nombres de artistas
  const getArtistNames = (track: any): string => {
    if (!track) return 'Desconocido';
    if (track.artists && Array.isArray(track.artists) && track.artists.length > 0) {
      return track.artists
        .filter((artist: any) => artist && artist.name)
        .map((artist: any) => artist.name)
        .join(', ');
    }
    return 'Desconocido';
  };

  // Formatear duración
  const formatDuration = (ms: number): string => {
    if (isNaN(ms) || ms <= 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (isLoading) {
    return (
      <div className="search-results-container">
        <button onClick={onBack} className="back-button">← Volver</button>
        <p className="searching-message">Cargando detalles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-results-container">
        <button onClick={onBack} className="back-button">← Volver</button>
        <p className="error-message">Error: {error}</p>
      </div>
    );
  }

  // Función para renderizar las canciones en formato de grid
  const renderTrackGrid = () => {
    let tracks = [];
    
    if (itemType === 'artist') {
      tracks = details?.tracks || [];
    } else if (itemType === 'album') {
      tracks = details?.items || [];
    } else if (itemType === 'playlist') {
      tracks = details?.items?.map((item: any) => item.track).filter((track: any) => track !== null) || [];
    }

    if (!tracks || tracks.length === 0) {
      return <p className="no-tracks-message">No se encontraron canciones.</p>;
    }

    return (
      <div className="results-grid">
        {tracks.map((track: any, index: number) => {
          if (!track) return null;

          // Para álbumes, usa la imagen del álbum principal
          let imageUrl;
          if (itemType === 'album') {
            imageUrl = item.images && item.images.length > 0 
              ? item.images[0].url 
              : 'https://via.placeholder.com/300x300?text=No+Image';
          } else {
            // Para otros casos, usa la función getImageUrl normal
            imageUrl = getImageUrl(track, 'track');
          }

          return (
            <div key={track.id} className="result-item">
              <img
                src={imageUrl}
                alt={track.name || 'Unknown Track'}
                className="item-image"
              />
              <p className="item-title">{track.name || 'Unknown Track'}</p>
              <p className="item-subtitle">{getArtistNames(track)}</p>
              <div className="item-actions">
                <button
                  onClick={() => track.uri && onPlayUri(track.uri)}
                  disabled={!track.uri}
                  className={track.uri ? 'play-button enabled' : 'play-button disabled'}
                >
                  Reproducir
                </button>
                <span className="item-subtitle" style={{ fontSize: '0.7rem', marginTop: '5px' }}>
                  {formatDuration(track.duration_ms)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Función para renderizar los álbumes del artista
  const renderAlbums = () => {
    if (albums.length === 0) return null;

    return (
      <div className="results-grid">
        <h2 style={{ color: 'white', marginBottom: '20px' }}>Álbumes</h2>
        {albums.map((album: any) => (
          <div key={album.id} className="result-item">
            <img
              src={getImageUrl(album, 'album')}
              alt={album.name || 'Unknown Album'}
              className="item-image"
            />
            <p className="item-title">{album.name || 'Unknown Album'}</p>
            <p className="item-subtitle">{getArtistNames(album)}</p>
            <button
              onClick={async () => {
                setSelectedAlbum(album);
                await fetchAlbumTracks(album.id);
              }}
              disabled={!album.uri}
              className={album.uri ? 'play-button enabled' : 'play-button disabled'}
            >
              Ver Canciones
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Función para mostrar las canciones de un álbum específico
  const renderSelectedAlbumTracks = () => {
    if (albumTracks.length === 0) {
      return <p className="no-tracks-message">No se encontraron canciones.</p>;
    }

    return (
      <div className="results-grid">
        {albumTracks.map((track: any, index: number) => {
          if (!track) return null;

          return (
            <div key={track.id} className="result-item">
              <img
                src={selectedAlbum.images && selectedAlbum.images.length > 0 
                  ? selectedAlbum.images[0].url 
                  : 'https://via.placeholder.com/300x300?text=No+Image'}
                alt={track.name || 'Unknown Track'}
                className="item-image"
              />
              <p className="item-title">{track.name || 'Unknown Track'}</p>
              <p className="item-subtitle">{getArtistNames(track)}</p>
              <div className="item-actions">
                <button
                  onClick={() => track.uri && onPlayUri(track.uri)}
                  disabled={!track.uri}
                  className={track.uri ? 'play-button enabled' : 'play-button disabled'}
                >
                  Reproducir
                </button>
                <span className="item-subtitle" style={{ fontSize: '0.7rem', marginTop: '5px' }}>
                  {formatDuration(track.duration_ms)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Si hay un álbum seleccionado, solo muestra el álbum
  if (selectedAlbum) {
    return (
      <div className="search-results-container">
        <button onClick={onBack} className="back-button">← Volver</button>
        
        <div className="results-grid" style={{ marginBottom: '30px' }}>
          <div className="result-item" style={{ backgroundColor: '#282828', border: 'none' }}>
            <img
              src={getImageUrl(selectedAlbum, 'album')}
              alt={selectedAlbum.name || 'Unknown Album'}
              className="item-image"
            />
            <p className="item-title" style={{ color: 'white' }}>{selectedAlbum.name}</p>
            <p className="item-subtitle">{getArtistNames(selectedAlbum)}</p>
            <p className="item-subtitle" style={{ marginTop: '10px', fontWeight: 'bold' }}>
              {albumTracks.length} canciones
            </p>
            <button
              onClick={() => selectedAlbum.uri && onPlayUri(selectedAlbum.uri)}
              disabled={!selectedAlbum.uri}
              className={selectedAlbum.uri ? 'play-button enabled' : 'play-button disabled'}
              style={{ marginTop: '10px' }}
            >
              Reproducir Álbum
            </button>
          </div>
        </div>

        <h2 style={{ color: 'white', marginBottom: '20px' }}>
          Canciones de {selectedAlbum.name}
        </h2>
        {renderSelectedAlbumTracks()}
      </div>
    );
  }

  // Si no hay álbum seleccionado, muestra el contenido normal
  return (
    <div className="search-results-container">
      <button onClick={onBack} className="back-button">← Volver</button>
      
      {/* Encabezado del ítem estilo SearchResults */}
      <div className="results-grid" style={{ marginBottom: '30px' }}>
        <div className="result-item" style={{ backgroundColor: '#282828', border: 'none' }}>
          <img
            src={getImageUrl(item, itemType)}
            alt={item.name || 'Unknown Item'}
            className="item-image"
          />
          <p className="item-title" style={{ color: 'white' }}>{item.name}</p>
          {itemType === 'artist' && (
            <p className="item-subtitle">Artista</p>
          )}
          {itemType === 'album' && (
            <p className="item-subtitle">
              {getArtistNames(item)} • {new Date((item as SpotifyAlbum).release_date).getFullYear()}
            </p>
          )}
          {itemType === 'playlist' && (
            <p className="item-subtitle">
              Por {(item as SpotifyPlaylist).owner?.display_name || 'Desconocido'}
            </p>
          )}
          {details && (
            <p className="item-subtitle" style={{ marginTop: '10px', fontWeight: 'bold' }}>
              {itemType === 'artist' ? (details.tracks?.length || 0) : 
               itemType === 'album' ? (details.items?.length || 0) : 
               (details.items?.filter((item: any) => item.track !== null).length || 0)} canciones
            </p>
          )}
          {/* Solo muestra el botón "Reproducir Top Tracks" si es un artista */}
          {itemType === 'artist' && (
            <button
              onClick={() => item.uri && onPlayUri(item.uri)}
              disabled={!item.uri}
              className={item.uri ? 'play-button enabled' : 'play-button disabled'}
              style={{ marginTop: '10px' }}
            >
              Reproducir Top Tracks
            </button>
          )}
        </div>
      </div>

      {/* Lista de canciones en formato grid */}
      <>
        <h2 style={{ color: 'white', marginBottom: '20px' }}>
          {itemType === 'artist' ? 'Top Tracks' : 
           itemType === 'album' ? 'Canciones del Álbum' : 'Canciones de la Playlist'}
        </h2>
        {renderTrackGrid()}
      </>

      {/* Lista de álbumes del artista */}
      {itemType === 'artist' && renderAlbums()}
    </div>
  );
};

export default ItemDetails;
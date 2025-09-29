// src/components/ItemDetails.tsx
import React, { useState, useEffect } from 'react';
import apiClient from '../lib/api';
import { SpotifyAlbum, SpotifyArtist, SpotifyPlaylist } from '../types/spotify-types';
import { useUser } from '../context/UserContext';
import '../styles/cards.css';

interface ItemDetailsProps {
  item: SpotifyArtist | SpotifyAlbum | SpotifyPlaylist;
  itemType: 'artist' | 'album' | 'playlist';
  onPlayUri: (uri: string) => void;
  onBack: () => void;
}

const MusicItemDetails: React.FC<ItemDetailsProps> = ({ item, itemType, onPlayUri, onBack }) => {
  const { user } = useUser();
  const [details, setDetails] = useState<any>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [albumTracks, setAlbumTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums'>('tracks');

  // favoritos
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadingFavorite, setLoadingFavorite] = useState<string | null>(null);

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
        setError(err.response?.data?.message || err.message || 'Failed to load details');
      } finally {
        setIsLoading(false);
      }
    };

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

  // cargar favoritos del usuario
  const loadFavorites = async () => {
    if (user) {
      try {
        const response = await fetch(`http://localhost:3001/user-favorites/${user.user_id}`);
        const data = await response.json();
        const userFavorites = new Set(data.map((item: { spotify_uri: string }) => item.spotify_uri));
        setFavorites(userFavorites);
      } catch (error) {
        console.error("Error al cargar los favoritos:", error);
      }
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [user]);

  const handleFavoriteToggle = async (
    contentType: "track" | "album" | "artist" | "playlist",
    spotifyUri: string,
    name: string,
    imageUrl: string
  ) => {
    if (!user) {
      alert("Debes iniciar sesión para guardar favoritos.");
      return;
    }

    setLoadingFavorite(spotifyUri);

    try {
      const isFavorite = favorites.has(spotifyUri);

      if (isFavorite) {
        const response = await fetch(
          `http://localhost:3001/user-favorites/${user.user_id}?spotify_uri=${spotifyUri}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (response.ok) {
          setFavorites((prevFavorites) => {
            const newFavorites = new Set(prevFavorites);
            newFavorites.delete(spotifyUri);
            return newFavorites;
          });
          alert("Contenido eliminado de favoritos");
        } else {
          const data = await response.json();
          alert(data.message || "Error al eliminar de favoritos");
        }
      } else {
        const response = await fetch("http://localhost:3001/user-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.user_id,
            content_type: contentType,
            spotify_uri: spotifyUri,
            name,
            image_url: imageUrl,
          }),
        });

        if (response.ok) {
          setFavorites((prevFavorites) => new Set(prevFavorites).add(spotifyUri));
          alert("Contenido agregado a favoritos");
        } else {
          const data = await response.json();
          alert(data.message || "Error al guardar en favoritos");
        }
      }
    } catch (error) {
      alert("Error de conexión al guardar o eliminar favorito");
    } finally {
      setLoadingFavorite(null);
    }
  };

  const fetchAlbumTracks = async (albumId: string) => {
    try {
      const response = await apiClient.get(`/spotify/album/${albumId}/tracks`);
      setAlbumTracks(response.data.items || []);
    } catch (err) {
      console.error('Error fetching album tracks:', err);
    }
  };

  const getImageUrl = (itemData: any, type: 'track' | 'album' | 'artist' | 'playlist'): string => {
    try {
      if (type === 'track') {
        if (itemData.album?.images?.length > 0) {
          return itemData.album.images[0]?.url;
        }
      } else if (itemData.images?.length > 0) {
        return itemData.images[0]?.url;
      }
    } catch {}
    return 'https://via.placeholder.com/300x300?text=No+Image';
  };

  const getArtistNames = (track: any): string => {
    return track?.artists?.map((a: any) => a.name).join(', ') || 'Desconocido';
  };

  const formatDuration = (ms: number): string => {
    if (!ms) return '0:00';
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

  const renderTrackGrid = () => {
    let tracks: any[] = [];
    if (itemType === 'artist') tracks = details?.tracks || [];
    if (itemType === 'album') tracks = details?.items || [];
    if (itemType === 'playlist') tracks = details?.items?.map((i: any) => i.track).filter(Boolean) || [];

    if (tracks.length === 0) {
      return <p className="no-tracks-message">No se encontraron canciones.</p>;
    }

    return (
      <div className="results-grid">
        {tracks.map((track) => {
          const imageUrl =
            itemType === 'album'
              ? getImageUrl(item, 'album')
              : getImageUrl(track, 'track');
          const isFavorite = favorites.has(track.uri!);

          return (
            <div key={track.id} className="result-item">
              <img src={imageUrl} alt={track.name} className="item-image" />
              <p className="item-title">{track.name}</p>
              <p className="item-subtitle">{getArtistNames(track)}</p>
              <div className="item-actions">
                <button
                  onClick={() => track.uri && onPlayUri(track.uri)}
                  disabled={!track.uri}
                  className={track.uri ? 'play-button enabled' : 'play-button disabled'}
                >
                  Reproducir
                </button>
                <button
                  className={`favorite-button ${isFavorite ? "favorited" : ""}`}
                  disabled={loadingFavorite === track.uri}
                  onClick={() => handleFavoriteToggle("track", track.uri!, track.name, imageUrl)}
                >
                  {loadingFavorite === track.uri ? "Guardando..." : isFavorite ? "❤️" : "🤍"}
                </button>
                <span className="item-subtitle">{formatDuration(track.duration_ms)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAlbums = () => {
    if (albums.length === 0) return null;

    const sortedAlbums = [...albums].sort(
      (a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
    );

    return (
      <div>
        <h2 style={{ marginBottom: '20px' }}>Álbumes</h2>
        <div className="results-grid">
          {sortedAlbums.map((album) => (
            <div
              key={album.id}
              className="result-item"
              style={{ cursor: 'pointer' }}
              onClick={async () => {
                setSelectedAlbum(album);
                await fetchAlbumTracks(album.id);
              }}
            >
              <img src={getImageUrl(album, 'album')} alt={album.name} className="item-image" />
              <p className="item-title">{album.name}</p>
              <p className="item-subtitle">{getArtistNames(album)}</p>
              <p className="item-subtitle">
                {album.release_date ? new Date(album.release_date).getFullYear() : ''}
              </p>
              <div className="item-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    album.uri && onPlayUri(album.uri);
                  }}
                  disabled={!album.uri}
                  className={album.uri ? 'play-button enabled' : 'play-button disabled'}
                  style={{ marginTop: '8px' }}
                >
                  Reproducir Álbum
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSelectedAlbumTracks = () => {
    if (albumTracks.length === 0) {
      return <p className="no-tracks-message">No se encontraron canciones.</p>;
    }

    return (
      <div className="results-grid">
        {albumTracks.map((track) => {
          const imageUrl = getImageUrl(selectedAlbum, 'album');
          const isFavorite = favorites.has(track.uri!);

          return (
            <div key={track.id} className="result-item">
              <img src={imageUrl} alt={track.name} className="item-image" />
              <p className="item-title">{track.name}</p>
              <p className="item-subtitle">{getArtistNames(track)}</p>
              <div className="item-actions">
                <button
                  onClick={() => track.uri && onPlayUri(track.uri)}
                  disabled={!track.uri}
                  className={track.uri ? 'play-button enabled' : 'play-button disabled'}
                >
                  Reproducir
                </button>
                <button
                  className={`favorite-button ${isFavorite ? "favorited" : ""}`}
                  disabled={loadingFavorite === track.uri}
                  onClick={() => handleFavoriteToggle("track", track.uri!, track.name, imageUrl)}
                >
                  {loadingFavorite === track.uri ? "Guardando..." : isFavorite ? "❤️" : "🤍"}
                </button>
                <span className="item-subtitle">{formatDuration(track.duration_ms)}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (selectedAlbum) {
    return (
      <div className="search-results-container">
        <button onClick={onBack} className="back-button">← Volver</button>
        <div className="results-grid">
          <div className="result-item">
            <img src={getImageUrl(selectedAlbum, 'album')} alt={selectedAlbum.name} className="item-image" />
            <p className="item-title">{selectedAlbum.name}</p>
            <p className="item-subtitle">{getArtistNames(selectedAlbum)}</p>
            <p className="item-subtitle"><b>{albumTracks.length} canciones</b></p>
            <button
              onClick={() => selectedAlbum.uri && onPlayUri(selectedAlbum.uri)}
              disabled={!selectedAlbum.uri}
              className={selectedAlbum.uri ? 'play-button enabled' : 'play-button disabled'}
            >
              Reproducir Álbum
            </button>
          </div>
        </div>
        <h2>Canciones de {selectedAlbum.name}</h2>
        {renderSelectedAlbumTracks()}
      </div>
    );
  }

  return (
    <div className="search-results-container">
      <button onClick={onBack} className="back-button">← Volver</button>

      <div className="results-grid">
        <div className="result-item">
          <img src={getImageUrl(item, itemType)} alt={item.name} className="item-image" />
          <p className="item-title">{item.name}</p>
          {itemType === 'artist' && <p className="item-subtitle">Artista</p>}
          {itemType === 'album' && (
            <>
              <p className="item-subtitle">
                {getArtistNames(item)} • {new Date((item as SpotifyAlbum).release_date).getFullYear()}
              </p>
              <button
                onClick={() => item.uri && onPlayUri(item.uri)}
                disabled={!item.uri}
                className={item.uri ? 'play-button enabled' : 'play-button disabled'}
                style={{ marginTop: '10px' }}
              >
                Reproducir Álbum
              </button>
            </>
          )}
          {itemType === 'playlist' && (
            <>
              <p className="item-subtitle">Por {(item as SpotifyPlaylist).owner?.display_name || 'Desconocido'}</p>
              <button
                onClick={() => item.uri && onPlayUri(item.uri)}
                disabled={!item.uri}
                className={item.uri ? 'play-button enabled' : 'play-button disabled'}
                style={{ marginTop: '10px' }}
              >
                Reproducir Playlist
              </button>
            </>
          )}
        </div>
      </div>

      {itemType === 'artist' && (
        <div className="item-actions" style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <button
            onClick={() => setActiveTab('tracks')}
            className={activeTab === 'tracks' ? 'play-button enabled' : 'details-button'}
          >
            Top Tracks
          </button>
          <button
            onClick={() => setActiveTab('albums')}
            className={activeTab === 'albums' ? 'play-button enabled' : 'details-button'}
          >
            Álbumes
          </button>
        </div>
      )}

      {itemType === 'artist' ? (
        <>
          {activeTab === 'tracks' && (
            <>
              <h2>Top Tracks</h2>
              {renderTrackGrid()}
            </>
          )}
          {activeTab === 'albums' && renderAlbums()}
        </>
      ) : (
        <>
          <h2>{itemType === 'album' ? 'Canciones del Álbum' : 'Canciones de la Playlist'}</h2>
          {renderTrackGrid()}
        </>
      )}
    </div>
  );
};

export default MusicItemDetails;

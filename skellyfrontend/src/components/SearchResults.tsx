// src/components/SearchResults.tsx
import React, { useState } from 'react';
import { SpotifyTrack, SpotifyAlbum, SpotifyArtist, SpotifyPlaylist, SearchResult } from '../types/spotify-types';
import ItemDetails from './itemDetails'; // Importar el nuevo componente
import '../styles/searchResults.css';

interface SearchResultsProps {
  searchResults: SearchResult | null;
  isSearching: boolean;
  onPlayUri: (uri: string) => void;
}

// Tipo para el estado de navegación
type NavigationState = 
  | { view: 'list' }
  | { view: 'details'; item: SpotifyArtist | SpotifyAlbum | SpotifyPlaylist; type: 'artist' | 'album' | 'playlist' };

const SearchResults: React.FC<SearchResultsProps> = ({ searchResults, isSearching, onPlayUri }) => {
  const [navigation, setNavigation] = useState<NavigationState>({ view: 'list' });
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums' | 'artists' | 'playlists'>('tracks');

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

  // Función para obtener los nombres de los artistas
  const getArtistNames = (item: any): string => {
    if (!item) return 'Desconocido';
    if (item.artists && Array.isArray(item.artists) && item.artists.length > 0) {
      return item.artists
        .filter((artist: any) => artist && artist.name)
        .map((artist: any) => artist.name)
        .join(', ');
    }
    return 'Desconocido';
  };

  // Función para manejar la navegación a los detalles
  const handleViewDetails = (item: SpotifyArtist | SpotifyAlbum | SpotifyPlaylist, type: 'artist' | 'album' | 'playlist') => {
    setNavigation({ view: 'details', item, type });
  };

  // Función para volver a la lista
  const handleBackToList = () => {
    setNavigation({ view: 'list' });
  };

  const renderResults = () => {
    if (!searchResults) return null;

    switch (activeTab) {
      case 'tracks':
        return (
          <div className="results-grid">
            {searchResults.tracks?.filter(track => track !== null).map((track) => (
              <div key={track.id} className="result-item">
                <img
                  src={getImageUrl(track, 'track')}
                  alt={track.name || 'Unknown Track'}
                  className="item-image"
                />
                <p className="item-title">{track.name || 'Unknown Track'}</p>
                <p className="item-subtitle">{getArtistNames(track)}</p>
                <button
                  onClick={() => track.uri && onPlayUri(track.uri)}
                  disabled={!track.uri}
                  className={track.uri ? 'play-button enabled' : 'play-button disabled'}
                >
                  Reproducir
                </button>
              </div>
            ))}
          </div>
        );
      case 'albums':
        return (
          <div className="results-grid">
            {searchResults.albums?.filter(album => album !== null).map((album) => (
              <div key={album.id} className="result-item">
                <img
                  src={getImageUrl(album, 'album')}
                  alt={album.name || 'Unknown Album'}
                  className="item-image"
                />
                <p className="item-title">{album.name || 'Unknown Album'}</p>
                <p className="item-subtitle">{getArtistNames(album)}</p>
                <div className="item-actions">
                  <button
                    onClick={() => album.uri && onPlayUri(album.uri)}
                    disabled={!album.uri}
                    className={album.uri ? 'play-button enabled' : 'play-button disabled'}
                  >
                    Reproducir Álbum
                  </button>
                  <button
                    onClick={() => handleViewDetails(album, 'album')}
                    className="details-button"
                  >
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      case 'artists':
        return (
          <div className="results-grid">
            {searchResults.artists?.filter(artist => artist !== null).map((artist) => (
              <div key={artist.id} className="result-item">
                <img
                  src={getImageUrl(artist, 'artist')}
                  alt={artist.name || 'Unknown Artist'}
                  className="item-image"
                />
                <p className="item-title">{artist.name || 'Unknown Artist'}</p>
                <div className="item-actions">
                  <button
                    onClick={() => artist.uri && onPlayUri(artist.uri)}
                    disabled={!artist.uri}
                    className={artist.uri ? 'play-button enabled' : 'play-button disabled'}
                  >
                    Reproducir Top Tracks
                  </button>
                  <button
                    onClick={() => handleViewDetails(artist, 'artist')}
                    className="details-button"
                  >
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      case 'playlists':
        return (
          <div className="results-grid">
            {searchResults.playlists?.filter(playlist => playlist !== null).map((playlist) => (
              <div key={playlist.id} className="result-item">
                <img
                  src={getImageUrl(playlist, 'playlist')}
                  alt={playlist.name || 'Unknown Playlist'}
                  className="item-image"
                />
                <p className="item-title">{playlist.name || 'Unknown Playlist'}</p>
                <p className="item-subtitle">
                  Por {playlist.owner?.display_name || 'Desconocido'}
                </p>
                <div className="item-actions">
                  <button
                    onClick={() => playlist.uri && onPlayUri(playlist.uri)}
                    disabled={!playlist.uri}
                    className={playlist.uri ? 'play-button enabled' : 'play-button disabled'}
                  >
                    Reproducir Playlist
                  </button>
                  <button
                    onClick={() => handleViewDetails(playlist, 'playlist')}
                    className="details-button"
                  >
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  if (isSearching) {
    return <p className="searching-message">Buscando...</p>;
  }

  // Renderizar detalles si es el caso
  if (navigation.view === 'details') {
    return (
      <ItemDetails
        item={navigation.item}
        itemType={navigation.type}
        onPlayUri={onPlayUri}
        onBack={handleBackToList}
      />
    );
  }

  if (!searchResults) {
    return null;
  }

  return (
    <div className="search-results-container">
      {/* Pestañas de navegación */}
      <div className="tabs-container">
        <button
          onClick={() => setActiveTab('tracks')}
          className={activeTab === 'tracks' ? 'tab-button active' : 'tab-button inactive'}
        >
          Canciones
        </button>
        <button
          onClick={() => setActiveTab('albums')}
          className={activeTab === 'albums' ? 'tab-button active' : 'tab-button inactive'}
        >
          Álbumes
        </button>
        <button
          onClick={() => setActiveTab('artists')}
          className={activeTab === 'artists' ? 'tab-button active' : 'tab-button inactive'}
        >
          Artistas
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={activeTab === 'playlists' ? 'tab-button active' : 'tab-button inactive'}
        >
          Playlists
        </button>
      </div>

      {/* Resultados filtrados por pestaña */}
      <div>
        {renderResults()}
      </div>
    </div>
  );
};

export default SearchResults;
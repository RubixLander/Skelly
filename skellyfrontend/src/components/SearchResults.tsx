// src/components/SearchResults.tsx
import React, { useState } from 'react';
import { SpotifyTrack, SpotifyAlbum, SpotifyArtist, SpotifyPlaylist, SearchResult } from '../types/spotify-types';
import MusicItemDetails from './MusicItemDetails';
import '../styles/searchResults.css';

interface SearchResultsProps {
  searchResults: SearchResult | null;
  isSearching: boolean;
  onPlayUri: (uri: string) => void;
}

type NavigationState = 
  | { view: 'list' }
  | { view: 'details'; item: SpotifyArtist | SpotifyAlbum | SpotifyPlaylist; type: 'artist' | 'album' | 'playlist' };

const SearchResults: React.FC<SearchResultsProps> = ({ searchResults, isSearching, onPlayUri }) => {
  const [navigation, setNavigation] = useState<NavigationState>({ view: 'list' });
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums' | 'artists' | 'playlists'>('tracks');

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

  const getArtistNames = (item: any): string => {
    if (!item) return 'Desconocido';
    if (item.artists?.length > 0) {
      return item.artists.map((artist: any) => artist.name).join(', ');
    }
    return 'Desconocido';
  };

  const handleViewDetails = (item: SpotifyArtist | SpotifyAlbum | SpotifyPlaylist, type: 'artist' | 'album' | 'playlist') => {
    setNavigation({ view: 'details', item, type });
  };

  const handleBackToList = () => {
    setNavigation({ view: 'list' });
  };

  const renderResults = () => {
    if (!searchResults) return null;

    switch (activeTab) {
      case 'tracks':
        return (
          <div className="results-grid">
            {searchResults.tracks?.map((track) => (
              <div key={track.id} className="result-item">
                <img src={getImageUrl(track, 'track')} alt={track.name} className="item-image" />
                <p className="item-title">{track.name}</p>
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
            {searchResults.albums?.map((album) => (
              <div
                key={album.id}
                className="result-item"
                onClick={() => handleViewDetails(album, 'album')}
                style={{ cursor: 'pointer' }}
              >
                <img src={getImageUrl(album, 'album')} alt={album.name} className="item-image" />
                <p className="item-title">{album.name}</p>
                <p className="item-subtitle">{getArtistNames(album)}</p>
                <div className="item-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      album.uri && onPlayUri(album.uri);
                    }}
                    disabled={!album.uri}
                    className={album.uri ? 'play-button enabled' : 'play-button disabled'}
                  >
                    Reproducir Álbum
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      case 'artists':
        return (
          <div className="results-grid">
            {searchResults.artists?.map((artist) => (
              <div
                key={artist.id}
                className="result-item"
                onClick={() => handleViewDetails(artist, 'artist')}
                style={{ cursor: 'pointer' }}
              >
                <img src={getImageUrl(artist, 'artist')} alt={artist.name} className="item-image" />
                <p className="item-title">{artist.name}</p>
                <div className="item-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      artist.uri && onPlayUri(artist.uri);
                    }}
                    disabled={!artist.uri}
                    className={artist.uri ? 'play-button enabled' : 'play-button disabled'}
                  >
                    Reproducir Top Tracks
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
case 'playlists':
  return (
    <div className="results-grid">
      {searchResults.playlists
        ?.filter((playlist): playlist is SpotifyPlaylist => playlist !== null) // 🔥 evita nulls
        .map((playlist) => (
          <div
            key={playlist.id}
            className="result-item"
            onClick={() => handleViewDetails(playlist, 'playlist')}
            style={{ cursor: 'pointer' }}
          >
            <img
              src={getImageUrl(playlist, 'playlist')}
              alt={playlist?.name || 'Unknown Playlist'}
              className="item-image"
            />
            <p className="item-title">{playlist?.name || 'Unknown Playlist'}</p>
            <p className="item-subtitle">
              Por {playlist?.owner?.display_name || 'Desconocido'}
            </p>
            <div className="item-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playlist.uri && onPlayUri(playlist.uri);
                }}
                disabled={!playlist.uri}
                className={playlist.uri ? 'play-button enabled' : 'play-button disabled'}
              >
                Reproducir Playlist
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

  if (navigation.view === 'details') {
    return (
      <MusicItemDetails
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

      <div>{renderResults()}</div>
    </div>
  );
};

export default SearchResults;

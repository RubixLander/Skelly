// src/components/ItemDetails.tsx (Código final con lógica de compartir local y renderizado completo)
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/api';
import { SpotifyAlbum, SpotifyArtist, SpotifyPlaylist } from '../types/spotify-types';
import { useUser } from '../context/UserContext';
import '../styles/cards.css';

// 💡 IMPORTANTE: Debes asegurarte de que esta ruta sea correcta para tu CommentSection.tsx
import CommentSection from './commentsSection'; 

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

  // Favoritos
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadingFavorite, setLoadingFavorite] = useState<string | null>(null);

  // ESTADOS DE COMENTARIOS
  const [showComments, setShowComments] = useState(false);
  const [commentTarget, setCommentTarget] = useState<{ uri: string, type: 'track' | 'album' | 'playlist', image: string, title: string } | null>(null);
  
  // ESTADOS DE COMPARTIR
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ uri: string, type: string, title: string } | null>(null);
  
  // 💡 ESTADO ADICIONAL NECESARIO: Grupos del usuario (cargados al abrir el modal)
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);


  // --- Funciones Auxiliares de Presentación ---
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
  // ---------------------------------------------


  // --- Efectos y Lógica de Datos (Fetch Details y Albums) ---
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

  // --- Lógica de Favoritos (Permanece igual) ---
  // Cargar favoritos del usuario
  const loadFavorites = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [user, loadFavorites]);

  const handleFavoriteToggle = async (/* ... */) => { /* ... Lógica de favoritos ... */ };

  const fetchAlbumTracks = async (albumId: string) => {
    try {
      const response = await apiClient.get(`/spotify/album/${albumId}/tracks`);
      setAlbumTracks(response.data.items || []);
    } catch (err) {
      console.error('Error fetching album tracks:', err);
    }
  };
  // ---------------------------------------------


  // --- Lógica de Compartir (Corregida y Completa) ---

  // 💡 NUEVA FUNCIÓN: Cargar los grupos del usuario (llamada antes de mostrar el modal)
  const loadUserGroups = useCallback(async (userId: string) => {
      setIsLoadingGroups(true);
      try {
          // LLAMADA AL BACKEND: Endpoint para listar los grupos de un usuario
          const response = await apiClient.get(`/api/groups/user/${userId}`);
          setUserGroups(response.data || []);
      } catch (error) {
          console.error('Error fetching user groups:', error);
          setUserGroups([]);
      } finally {
          setIsLoadingGroups(false);
      }
  }, []);


  // 💡 handleShare: Abre el modal interno si hay usuario.
  const handleShare = async (name: string, spotifyUri: string, contentType: string) => {
    if (!user || !user.user_id) { // Aseguramos que haya usuario y user_id
        // Fallback: compartir enlace externo
        const shareUrl = `https://myspotifyclone.com/item/${contentType}/${spotifyUri.split(':').pop()}`;
        const shareData = {
          title: `Escucha ${name} en SkellyTunes`,
          text: `Mira este ${contentType}: ${name}`,
          url: shareUrl,
        };

        try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            // Fallback: copiar al portapapeles
            await navigator.clipboard.writeText(shareUrl);
            alert(`Enlace copiado al portapapeles: ${shareUrl}`);
          }
        } catch (err) {
          console.error('Error al compartir o copiar:', err);
          alert('Error al intentar compartir.');
        }
        return; 
    }
    
    // ✅ LÓGICA DE COMPARTIR INTERNO: Abre el modal de comunidades
    setShareTarget({ uri: spotifyUri, type: contentType, title: name });
    await loadUserGroups(user.user_id); // Carga los grupos ANTES de mostrar el modal
    setShowShareModal(true);
  };

  // 💡 NUEVA FUNCIÓN: Cerrar el modal de compartir
  const handleShareModalClose = () => {
    setShowShareModal(false);
    setShareTarget(null);
    setUserGroups([]); // Limpiar grupos para la próxima apertura
  };
  
  // 🚀 FUNCIÓN COMPLETA 1: Compartir en una comunidad específica (POST /api/groups/:groupId/shared)
  const handleShareToCommunity = async (communityId: string, communityName: string) => {
      if (!shareTarget || !user || !user.user_id) {
          alert('Error: Datos de usuario o contenido faltantes.');
          return;
      }
      
      try {
          // LLAMADA REAL A LA API: Endpoint para compartir en un grupo
          await apiClient.post(`/api/groups/${communityId}/shared`, { 
              spotify_uri: shareTarget.uri, 
              content_type: shareTarget.type, 
              user_id: user.user_id 
          });
          
          alert(`¡${shareTarget.title} compartido con éxito en la comunidad ${communityName}!`);
          
      } catch (error: any) {
          console.error(`Error al compartir en ${communityName}:`, error);
          const errorMessage = error.response?.data?.message || `Error desconocido al compartir en ${communityName}.`;
          alert(`ERROR al compartir en ${communityName}: ${errorMessage}`); 
          
      } finally {
          handleShareModalClose();
      }
  };

  // 🚀 FUNCIÓN COMPLETA 2: Compartir en todas las comunidades (POST /api/groups/shared/broadcast)
  const handleShareToAllCommunities = async () => {
      if (!shareTarget || !user || !user.user_id) {
          alert('Error: Datos de usuario o contenido faltantes.');
          return;
      }
      
      try {
          // LLAMADA REAL A LA API: Endpoint para difusión (broadcast)
          const response = await apiClient.post('/api/groups/shared/broadcast', { 
              spotify_uri: shareTarget.uri, 
              content_type: shareTarget.type, 
              user_id: user.user_id 
          });

          const sharedCount = response.data?.shared || 0; 
          
          alert(`¡${shareTarget.title} compartido con éxito en ${sharedCount} comunidades!`);
          
      } catch (error: any) {
          console.error('Error al compartir en todas las comunidades:', error);
          const errorMessage = error.response?.data?.message || 'Error desconocido al compartir en todas las comunidades.';
          alert(`ERROR al compartir en todas: ${errorMessage}`);

      } finally {
          handleShareModalClose();
      }
  };


  // --- Lógica de Comentarios (Permanece igual) ---
  const handleComment = (
    spotifyUri: string,
    type: 'track' | 'album' | 'playlist',
    title: string,
    imageUrl: string
  ) => {
    if (!user) {
      alert("Debes iniciar sesión para comentar.");
      return;
    }
    setCommentTarget({ uri: spotifyUri, type: type, image: imageUrl, title: title });
    setShowComments(true);
  };
  
  const handleCommentBack = () => {
    setShowComments(false);
    setCommentTarget(null);
  };
  // ------------------------------------------------


  // ✅ renderCardActions: Centraliza la lógica de los botones
  const renderCardActions = (
    uri: string | undefined,
    id: string,
    name: string,
    contentType: "track" | "album" | "artist" | "playlist",
    imageUrl: string
  ): React.ReactNode => {
    const isFavorite = uri ? favorites.has(uri) : false;
    const isArtist = contentType === 'artist';

    return (
      <div className="item-actions">
        {/* Botón de Reproducir */}
        <button
          onClick={() => uri && onPlayUri(uri)}
          disabled={!uri}
          className={uri ? 'play-button enabled' : 'play-button disabled'}
        >
          {contentType === 'track' ? 'Reproducir' : `Reproducir ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`}
        </button>

        {/* Botón de Favorito */}
        {uri && (
          <button
            className={`favorite-button ${isFavorite ? "favorited" : ""}`}
            disabled={loadingFavorite === uri}
            onClick={(e) => {
              e.stopPropagation(); 
              handleFavoriteToggle(contentType, uri, name, imageUrl);
            }}
          >
            {loadingFavorite === uri
              ? "..."
              : isFavorite
              ? "✅️"
              : "➕"}
          </button>
        )}

        {/* Botón de Comentar */}
        {!isArtist && uri && (
          <button
            className="comment-button"
            onClick={(e) => {
              e.stopPropagation();
              handleComment(uri, contentType, name, imageUrl); 
            }}
          >
          💬 Comentarios
          </button>
        )}

        {/* Botón de Compartir - Llama a la handleShare local */}
        {uri && (
          <button
            className="share-button"
            onClick={(e) => {
              e.stopPropagation();
              handleShare(name, uri, contentType);
            }}
          >
            🔗 Compartir
          </button>
        )}
        
        {contentType === 'track' && uri && (
             <span className="item-subtitle">{formatDuration((details.items || albumTracks).find((t:any) => t.uri === uri)?.duration_ms || 0)}</span>
        )}
      </div>
    );
  };
  
  // --- Renderizado Principal ---

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

  // 💡 BLOQUE CLAVE: Renderiza CommentSection si está activo
  if (showComments && commentTarget) {
      return (
          <CommentSection 
              spotify_uri={commentTarget.uri}
              content_type={commentTarget.type}
              image_url={commentTarget.image}
              title={commentTarget.title}
              onBack={handleCommentBack} 
          />
      );
  }
  
  // 💡 BLOQUE CLAVE: Renderiza ShareModal si está activo
  if (showShareModal && shareTarget) {
      
      return (
          <div className="share-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="share-modal-content" style={{ backgroundColor: '#282828', padding: '20px', borderRadius: '8px', maxWidth: '400px', width: '90%', color: 'white' }}>
                  <h2 style={{ marginBottom: '15px' }}>Compartir en comunidades</h2>
                  <p style={{ marginBottom: '10px' }}>Contenido: **{shareTarget.title}** ({shareTarget.type})</p>
                  
                  <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Tus comunidades</h3>
                  
                  {isLoadingGroups ? (
                    <p>Cargando tus comunidades...</p>
                  ) : userGroups.length === 0 ? (
                    <p>No eres miembro de ninguna comunidad. Debes unirte o crear una.</p>
                  ) : (
                    // Renderizar las comunidades del usuario
                    userGroups.map((group) => (
                        <div key={group.group_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #404040' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <img 
                                    src={group.image_url || 'https://via.placeholder.com/40'} 
                                    alt={group.name} 
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover' }} 
                                />
                                <div>
                                    <p style={{ margin: 0, fontWeight: 'bold' }}>{group.name}</p>
                                    <p style={{ margin: 0, fontSize: '0.8em', color: '#b3b3b3' }}>{group.description || 'Sin descripción'}</p>
                                </div>
                            </div>
                            {/* 🚀 LLAMADA A RUTA ESPECÍFICA: /api/groups/:groupId/shared */}
                            <button 
                                style={{ backgroundColor: '#1DB954', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '25px', cursor: 'pointer', marginLeft: '10px' }} 
                                onClick={() => handleShareToCommunity(group.group_id, group.name)}
                            >
                                Compartir
                            </button>
                        </div>
                    ))
                  )}

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                      {/* 🚀 LLAMADA A RUTA BROADCAST: /api/groups/shared/broadcast */}
                      <button 
                          style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '25px', cursor: 'pointer', opacity: userGroups.length > 0 ? 1 : 0.5 }} 
                          onClick={handleShareToAllCommunities}
                          disabled={userGroups.length === 0}
                      >
                          Compartir en todas mis comunidades
                      </button>
                      <button 
                          style={{ backgroundColor: '#535353', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '25px', cursor: 'pointer' }} 
                          onClick={handleShareModalClose}
                      >
                          Cerrar
                      </button>
                  </div>
              </div>
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

    const primaryImageUrl = getImageUrl(item, itemType); 

    return (
        <div className="results-grid">
            {tracks.map((track, index) => { 
                const trackData = track; 

                if (!trackData.name) return null; 

                const key = trackData.id || `track-${index}`;
                const trackName = trackData.name;
                const trackUri = trackData.uri; 

                let imageUrl;

                if (itemType === 'album') {
                    imageUrl = primaryImageUrl; 
                } else {
                    imageUrl = getImageUrl(trackData, 'track'); 

                    if (imageUrl.includes('placeholder')) {
                         if (itemType === 'playlist' || itemType === 'artist') {
                            imageUrl = primaryImageUrl;
                         }
                    }
                }
                
                return (
                    <div key={key} className="result-item">
                        <img 
                            src={imageUrl} 
                            alt={trackName} 
                            className="item-image" 
                        />
                        <p className="item-title">{trackName}</p>
                        <p className="item-subtitle">{getArtistNames(trackData)}</p>
                        {/* ✅ renderCardActions */}
                        {renderCardActions(
                            trackUri, 
                            trackData.id || key, 
                            trackName,
                            'track',
                            imageUrl
                        )}
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
          {sortedAlbums.map((album) => {
            const albumImageUrl = getImageUrl(album, 'album'); 
            return (
            <div
              key={album.id}
              className="result-item"
              style={{ cursor: 'pointer' }}
              onClick={async () => {
                setSelectedAlbum(album);
                await fetchAlbumTracks(album.id);
              }}
            >
              <img src={albumImageUrl} alt={album.name} className="item-image" />
              <p className="item-title">{album.name}</p>
              <p className="item-subtitle">{getArtistNames(album)}</p>
              <p className="item-subtitle">
                {album.release_date ? new Date(album.release_date).getFullYear() : ''}
              </p>
              {/* ✅ USAMOS RENDERCARDACTIONS */}
              {renderCardActions(
                  album.uri,
                  album.id,
                  album.name,
                  'album',
                  albumImageUrl
              )}
            </div>
          )})}
        </div>
      </div>
    );
  };

  const renderSelectedAlbumTracks = () => {
    if (albumTracks.length === 0) {
      return <p className="no-tracks-message">No se encontraron canciones.</p>;
    }
    
    const selectedAlbumImageUrl = getImageUrl(selectedAlbum, 'album');

    return (
      <div className="results-grid">
        {/* Tarjeta del álbum seleccionado (para acciones) */}
        <div className="result-item">
          <img src={selectedAlbumImageUrl} alt={selectedAlbum.name} className="item-image" />
          <p className="item-title">{selectedAlbum.name}</p>
          <p className="item-subtitle">{getArtistNames(selectedAlbum)}</p>
          <p className="item-subtitle"><b>{albumTracks.length} canciones</b></p>
          {/* ✅ USAMOS RENDERCARDACTIONS PARA EL ÁLBUM SELECCIONADO */}
          {renderCardActions(
              selectedAlbum.uri,
              selectedAlbum.id,
              selectedAlbum.name,
              'album',
              selectedAlbumImageUrl
          )}
        </div>
        
        {/* Tracks del álbum */}
        {albumTracks.map((track) => {
          const imageUrl = getImageUrl(selectedAlbum, 'album');

          return (
            <div key={track.id} className="result-item">
              <img src={imageUrl} alt={track.name} className="item-image" />
              <p className="item-title">{track.name}</p>
              <p className="item-subtitle">{getArtistNames(track)}</p>
              {/* ✅ Aplicamos renderCardActions a cada track */}
              {renderCardActions(
                track.uri,
                track.id,
                track.name,
                'track',
                imageUrl
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (selectedAlbum) {
    return (
      <div className="search-results-container">
        <button onClick={() => setSelectedAlbum(null)} className="back-button">← Volver a {item.name}</button> 
        <h2>Canciones de {selectedAlbum.name}</h2>
        {renderSelectedAlbumTracks()}
      </div>
    );
  }

  return (
    <div className="search-results-container">
      <button onClick={onBack} className="back-button">← Volver</button>

      {/* Tarjeta de Detalle Principal */}
      <div className="results-grid">
        <div className="result-item">
          <img src={getImageUrl(item, itemType)} alt={item.name} className="item-image" />
          <p className="item-title">{item.name}</p>
          {itemType === 'artist' && <p className="item-subtitle">Artista</p>}
          
          {itemType === 'album' && (
            <p className="item-subtitle">
              {getArtistNames(item)} • {new Date((item as SpotifyAlbum).release_date).getFullYear()}
            </p>
          )}
          
          {itemType === 'playlist' && (
            <p className="item-subtitle">Por {(item as SpotifyPlaylist).owner?.display_name || 'Desconocido'}</p>
          )}

          {/* 💡 USAMOS RENDERCARDACTIONS PARA EL ITEM PRINCIPAL */}
          {renderCardActions(
            item.uri,
            item.id,
            item.name,
            itemType, 
            getImageUrl(item, itemType)
          )}
        </div>
      </div>
      {/* Fin Tarjeta de Detalle Principal */}

      {/* --- Contenido de Artista (Tracks/Albums) --- */}
      {itemType === 'artist' && (
        <div className="item-actions" style={{ flexDirection: 'row', justifyContent: 'center', margin: '20px 0' }}>
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
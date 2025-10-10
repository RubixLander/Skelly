// src/components/SearchResults.tsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyPlaylist,
  SearchResult,
} from "../types/spotify-types";
import MusicItemDetails from "./MusicItemDetails";
import CommentSection from "./commentsSection"; // ✅ Importamos CommentSection
import { useUser } from "../context/UserContext";
import "../styles/searchResults.css";
import UserItemDetails from "./UserItemDetails";
import ShareToGroupModal from "./ShareToGroupModal";

interface SearchResultsProps {
  searchResults: SearchResult | null;
  isSearching: boolean;
  onPlayUri: (uri: string) => void;
  showTabs?: boolean;
}

type NavigationState =
  | { view: "list" }
  | {
      view: "details";
      item: SpotifyArtist | SpotifyAlbum | SpotifyPlaylist;
      type: "artist" | "album" | "playlist";
    }
  | {
      view: "comments";
      spotify_uri: string;
      content_type: "track" | "album" | "playlist";
      image_url: string;
      title: string;
    }
  | {
      view: "user-details";
      user: {
        user_id: string;
        nickname: string;
        display_email: string;
        custom_profile_image_url?: string;
        bio?: string;
      };
    };

const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  isSearching,
  onPlayUri,
  showTabs = true,
}) => {
  const { user } = useUser();
  const [navigation, setNavigation] = useState<NavigationState>({
    view: "list",
  });
  const [activeTab, setActiveTab] = useState<
    "tracks" | "albums" | "artists" | "playlists" | "users"
  >("tracks");
  const [loadingFavorite, setLoadingFavorite] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const router = useRouter();

  // ======= NUEVOS ESTADOS PARA COMPARTIR =======
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePayload, setSharePayload] = useState<{
    spotify_uri: string;
    content_type: "track" | "album" | "playlist" | "artist";
  } | null>(null);

  const handleShareClick = (
    spotify_uri: string,
    content_type: "track" | "album" | "playlist" | "artist"
  ) => {
    // abrimos el modal flotante con la carga útil
    setSharePayload({ spotify_uri, content_type });
    setShareModalOpen(true);
  };
  // =============================================

  const isBibliotecaPage = router.pathname === "/biblioteca";
  const isProfilescaPage = router.pathname === "/profiles";

  if (isBibliotecaPage || isProfilescaPage) {
    return null;
  }

  const loadFavorites = async () => {
    if (user) {
      try {
        const response = await fetch(
          `http://localhost:3001/user-favorites/${user.user_id}`
        );
        const data = await response.json();
        const userFavorites = new Set(
          data.map((item: { spotify_uri: string }) => item.spotify_uri)
        );
        setFavorites(userFavorites);
      } catch (error) {
        console.error("Error al cargar los favoritos:", error);
      }
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [user]);

  const getImageUrl = (
    itemData: any,
    type: "track" | "album" | "artist" | "playlist"
  ): string => {
    try {
      if (type === "track") {
        if (itemData.album?.images?.length > 0) {
          return itemData.album.images[0]?.url;
        }
      } else if (itemData.images?.length > 0) {
        return itemData.images[0]?.url;
      }
    } catch {}
    return "https://via.placeholder.com/300x300?text=No+Image";
  };

  const getArtistNames = (item: any): string => {
    if (!item) return "Desconocido";
    if (item.artists?.length > 0) {
      return item.artists.map((artist: any) => artist.name).join(", ");
    }
    return "Desconocido";
  };

  const [previousTab, setPreviousTab] = useState<
    "tracks" | "albums" | "artists" | "playlists" | "users"
  >("tracks");

  const handleViewDetails = (
    item: SpotifyArtist | SpotifyAlbum | SpotifyPlaylist,
    type: "artist" | "album" | "playlist"
  ) => {
    setPreviousTab(activeTab); // guardamos el tab actual
    setNavigation({ view: "details", item, type });
  };

  const handleViewComments = (
    spotify_uri: string,
    content_type: "track" | "album" | "playlist",
    image_url: string,
    title: string
  ) => {
    setPreviousTab(activeTab); // guardamos el tab actual
    setNavigation({
      view: "comments",
      spotify_uri,
      content_type,
      image_url,
      title,
    });
  };

  const handleBackToList = () => {
    setNavigation({ view: "list" });
    setActiveTab(previousTab); // ✅ fuerza volver al tab de usuarios
  };

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
          setFavorites((prevFavorites) =>
            new Set(prevFavorites).add(spotifyUri)
          );
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

  const renderResults = () => {
    if (!searchResults) return null;

    switch (activeTab) {
      case "tracks":
        return (
          <div className="results-grid">
            {searchResults.tracks?.map((track) => {
              const imageUrl = getImageUrl(track, "track");
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
                      className={
                        track.uri ? "play-button enabled" : "play-button disabled"
                      }
                    >
                      Reproducir
                    </button>
                    <button
                      className={`favorite-button ${isFavorite ? "favorited" : ""}`}
                      disabled={loadingFavorite === track.uri}
                      onClick={() =>
                        handleFavoriteToggle(
                          "track",
                          track.uri!,
                          track.name,
                          imageUrl
                        )
                      }
                    >
                      {loadingFavorite === track.uri
                        ? "Guardando..."
                        : isFavorite
                        ? "❤️"
                        : "🤍"}
                    </button>
                    <button
                      className="comment-button"
                      onClick={() =>
                        handleViewComments(
                          track.uri!,
                          "track",
                          imageUrl,
                          track.name
                        )
                      }
                    >
                      💬 Comentarios
                    </button>

                    {/* BOTÓN COMPARTIR (track) */}
                    <button
                      className="share-button"
                      onClick={() => handleShareClick(track.uri!, "track")}
                    >
                      🔗 Compartir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      case "albums":
        return (
          <div className="results-grid">
            {searchResults.albums?.map((album) => {
              const imageUrl = getImageUrl(album, "album");
              const isFavorite = favorites.has(album.uri!);
              return (
                <div
                  key={album.id}
                  className="result-item"
                  onClick={() => handleViewDetails(album, "album")}
                  style={{ cursor: "pointer" }}
                >
                  <img src={imageUrl} alt={album.name} className="item-image" />
                  <p className="item-title">{album.name}</p>
                  <p className="item-subtitle">{getArtistNames(album)}</p>
                  <div className="item-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        album.uri && onPlayUri(album.uri);
                      }}
                      disabled={!album.uri}
                      className={
                        album.uri ? "play-button enabled" : "play-button disabled"
                      }
                    >
                      Reproducir Álbum
                    </button>
                    <button
                      className={`favorite-button ${isFavorite ? "favorited" : ""}`}
                      disabled={loadingFavorite === album.uri}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavoriteToggle(
                          "album",
                          album.uri!,
                          album.name,
                          imageUrl
                        );
                      }}
                    >
                      {loadingFavorite === album.uri ? "Guardando..." : isFavorite ? "❤️" : "🤍"}
                    </button>
                    <button
                      className="comment-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewComments(
                          album.uri!,
                          "album",
                          imageUrl,
                          album.name
                        );
                      }}
                    >
                      Ver comentarios
                    </button>

                    {/* BOTÓN COMPARTIR (album) */}
                    <button
                      className="share-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareClick(album.uri!, "album");
                      }}
                    >
                      🔗 Compartir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      case "artists":
        return (
          <div className="results-grid">
            {searchResults.artists?.map((artist) => {
              const imageUrl = getImageUrl(artist, "artist");
              const isFavorite = favorites.has(artist.uri!);
              return (
                <div
                  key={artist.id}
                  className="result-item"
                  onClick={() => handleViewDetails(artist, "artist")}
                  style={{ cursor: "pointer" }}
                >
                  <img src={imageUrl} alt={artist.name} className="item-image" />
                  <p className="item-title">{artist.name}</p>
                  <div className="item-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        artist.uri && onPlayUri(artist.uri);
                      }}
                      disabled={!artist.uri}
                      className={
                        artist.uri ? "play-button enabled" : "play-button disabled"
                      }
                    >
                      Reproducir Top Tracks
                    </button>
                    <button
                      className={`favorite-button ${isFavorite ? "favorited" : ""}`}
                      disabled={loadingFavorite === artist.uri}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavoriteToggle(
                          "artist",
                          artist.uri!,
                          artist.name,
                          imageUrl
                        );
                      }}
                    >
                      {loadingFavorite === artist.uri ? "Guardando..." : isFavorite ? "❤️" : "🤍"}
                    </button>

                    {/* BOTÓN COMPARTIR (artist) */}
                    <button
                      className="share-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareClick(artist.uri!, "artist");
                      }}
                    >
                      🔗 Compartir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      case "playlists":
        return (
          <div className="results-grid">
            {searchResults.playlists
              ?.filter((playlist): playlist is SpotifyPlaylist => playlist !== null)
              .map((playlist) => {
                const imageUrl = getImageUrl(playlist, "playlist");
                const isFavorite = favorites.has(playlist.uri!);
                return (
                  <div
                    key={playlist.id}
                    className="result-item"
                    onClick={() => handleViewDetails(playlist, "playlist")}
                    style={{ cursor: "pointer" }}
                  >
                    <img
                      src={imageUrl}
                      alt={playlist?.name || "Unknown Playlist"}
                      className="item-image"
                    />
                    <p className="item-title">{playlist?.name || "Unknown Playlist"}</p>
                    <p className="item-subtitle">
                      Por {playlist?.owner?.display_name || "Desconocido"}
                    </p>
                    <div className="item-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playlist.uri && onPlayUri(playlist.uri);
                        }}
                        disabled={!playlist.uri}
                        className={
                          playlist.uri ? "play-button enabled" : "play-button disabled"
                        }
                      >
                        Reproducir Playlist
                      </button>
                      <button
                        className={`favorite-button ${isFavorite ? "favorited" : ""}`}
                        disabled={loadingFavorite === playlist.uri}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFavoriteToggle(
                            "playlist",
                            playlist.uri!,
                            playlist.name || "Playlist",
                            imageUrl
                          );
                        }}
                      >
                        {loadingFavorite === playlist.uri ? "Guardando..." : isFavorite ? "❤️" : "🤍"}
                      </button>
                      <button
                        className="comment-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewComments(
                            playlist.uri!,
                            "playlist",
                            imageUrl,
                            playlist.name || "Playlist"
                          );
                        }}
                      >
                        Ver comentarios
                      </button>

                      {/* BOTÓN COMPARTIR (playlist) */}
                      <button
                        className="share-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareClick(playlist.uri!, "playlist");
                        }}
                      >
                        🔗 Compartir
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        );
      case "users":
        const handleUserClick = async (usr: any) => {
          try {
            const res = await fetch(`http://localhost:3001/users-details/${usr.user_id}`);
            if (!res.ok) throw new Error("Error al obtener detalles del usuario");
            const fullUser = await res.json();
            setNavigation({ view: "user-details", user: fullUser });
          } catch (err) {
            console.error("Error cargando detalles de usuario:", err);
            alert("No se pudo cargar la información del usuario.");
          }
        };

        return (
          <div className="results-grid">
            {searchResults.users?.length > 0 ? (
              searchResults.users.map((usr: any) => (
                <div
                  key={usr.user_id}
                  className="result-item"
                  onClick={() => handleUserClick(usr)}
                  style={{ cursor: "pointer" }}
                >
                  <img src={usr.custom_profile_image_url || "/profile.png"} alt={usr.nickname} className="item-image" />
                  <p className="item-title">{usr.nickname}</p>
                  <p className="item-subtitle">{usr.display_email}</p>
                  {usr.bio && <p className="item-subtitle">{usr.bio}</p>}
                </div>
              ))
            ) : (
              <p>No se encontraron usuarios</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (isSearching) {
    return <p className="searching-message">Buscando...</p>;
  }

  if (navigation.view === "details") {
    return (
      <MusicItemDetails
        item={navigation.item}
        itemType={navigation.type}
        onPlayUri={onPlayUri}
        onBack={handleBackToList}
      />
    );
  }

  if (navigation.view === "comments") {
    return (
      <CommentSection
        spotify_uri={navigation.spotify_uri}
        content_type={navigation.content_type}
        image_url={navigation.image_url}
        title={navigation.title}
        onBack={handleBackToList}
      />
    );
  }

  if (navigation.view === "user-details") {
    return (
      <UserItemDetails
        user={navigation.user}
        onBack={handleBackToList}
        onSelectUser={async (id) => {
          try {
            const res = await fetch(`http://localhost:3001/users-details/${id}`);
            if (!res.ok) throw new Error("Error al obtener detalles del usuario");
            const fullUser = await res.json();
            setNavigation({ view: "user-details", user: fullUser });
          } catch (err) {
            console.error("Error cargando detalles del usuario:", err);
            alert("No se pudo cargar la información del usuario.");
          }
        }}
      />
    );
  }

  const hasResultsToShow =
    (activeTab === "tracks" && searchResults?.tracks?.length > 0) ||
    (activeTab === "albums" && searchResults?.albums?.length > 0) ||
    (activeTab === "artists" && searchResults?.artists?.length > 0) ||
    (activeTab === "playlists" && searchResults?.playlists?.length > 0) ||
    (activeTab === "users" && searchResults?.users?.length > 0);

  return (
    <div className="search-results-container">
      {searchResults && !isSearching && showTabs && navigation.view === "list" && hasResultsToShow && (
        <div className="tabs-container">
          <button
            onClick={() => setActiveTab("tracks")}
            className={activeTab === "tracks" ? "tab-button active" : "tab-button inactive"}
          >
            Canciones
          </button>
          <button
            onClick={() => setActiveTab("albums")}
            className={activeTab === "albums" ? "tab-button active" : "tab-button inactive"}
          >
            Álbumes
          </button>
          <button
            onClick={() => setActiveTab("artists")}
            className={activeTab === "artists" ? "tab-button active" : "tab-button inactive"}
          >
            Artistas
          </button>
          <button
            onClick={() => setActiveTab("playlists")}
            className={activeTab === "playlists" ? "tab-button active" : "tab-button inactive"}
          >
            Playlists
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={activeTab === "users" ? "tab-button active" : "tab-button inactive"}
          >
            Usuarios
          </button>
        </div>
      )}

      <div>{renderResults()}</div>

      {/* ======= Modal flotante para compartir (si existe payload) ======= */}
      {sharePayload && (
        <ShareToGroupModal
          open={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSharePayload(null);
          }}
          spotifyUri={sharePayload.spotify_uri}
          contentType={sharePayload.content_type}
          userId={user?.user_id}
        />
      )}
      {/* ============================================================== */}
    </div>
  );
};

export default SearchResults;

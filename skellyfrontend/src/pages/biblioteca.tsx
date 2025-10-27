import React, { useState, useEffect } from "react";
import FullHeader from "../components/Fullheader";
import { useUser } from "../context/UserContext";
import { useSpotify } from "../context/SpotifyContext";
import MusicItemDetails from "../components/MusicItemDetails";
import { useRouter } from "next/router";
import MusicPlayer from "../components/SpotifyPlayer";
import CommentSection from "../components/commentsSection"; // ✅ importar

const Biblioteca: React.FC = () => {
  const { user } = useUser();
  const { playUri } = useSpotify();
  const router = useRouter();

  const [favorites, setFavorites] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type NavigationState =
    | { view: "list" }
    | { view: "details"; item: any; type: "artist" | "album" | "playlist" }
    | { view: "comments"; favorite: any };

  const [navigation, setNavigation] = useState<NavigationState>({ view: "list" });
  const [removingUri, setRemovingUri] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !user.user_id) return;

    const fetchFavorites = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3001/user-favorites/${user.user_id}`);
        if (!response.ok) throw new Error("Error al obtener los favoritos");
        const data = await response.json();
        setFavorites(data);
      } catch (err) {
        setError("No se pudieron obtener los favoritos.");
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const filteredFavorites = () => {
    if (filter === "all") return favorites;
    return favorites.filter((favorite) => favorite.content_type === filter.slice(0, -1));
  };

  const extractSpotifyId = (uri: string) => {
    if (!uri) return null;
    const parts = uri.split(":");
    return parts.length > 0 ? parts.pop() : null;
  };

  const handleViewDetails = async (item: any, type: "artist" | "album" | "playlist") => {
    const id = extractSpotifyId(item.spotify_uri);
    if (!id) return;

    try {
      let url = "";
      if (type === "artist") url = `http://localhost:3001/spotify/artist/${id}`;
      if (type === "album") url = `http://localhost:3001/spotify/album/${id}`;
      if (type === "playlist") url = `http://localhost:3001/spotify/playlist/${id}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error al obtener detalles de Spotify (${response.status}): ${text}`);
      }

      const fullData = await response.json();

      if (type === "artist" && fullData.topTracks && fullData.topTracks.length > 0) {
        playUri(fullData.topTracks[0].uri);
      }

      setNavigation({
        view: "details",
        item: fullData,
        type,
      });
    } catch (err) {
      console.error("❌ Error cargando detalles:", err);
      setError("No se pudieron cargar los detalles.");
    }
  };

  const handleBackToList = () => {
    setNavigation({ view: "list" });
  };

  const handlePlayTrack = (spotifyUri: string) => {
    playUri(spotifyUri);
  };

  const handlePlayArtistTopTracks = (artistIdOrUri: string) => {
    if (!artistIdOrUri) return;
    const artistId = extractSpotifyId(artistIdOrUri) || artistIdOrUri;
    playUri(`spotify:artist:${artistId}`);
  };

  const handleRemoveFavorite = async (spotifyUri: string) => {
    if (!user || !user.user_id || !spotifyUri) return;

    try {
      setRemovingUri(spotifyUri);
      const url = `http://localhost:3001/user-favorites/${user.user_id}?spotify_uri=${encodeURIComponent(
        spotifyUri
      )}`;

      const response = await fetch(url, { method: "DELETE" });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      setFavorites((prev) => prev.filter((fav) => fav.spotify_uri !== spotifyUri));
    } catch (err) {
      console.error("Error eliminando favorito:", err);
      const message = err instanceof Error ? err.message : "No se pudo eliminar de favoritos";
      alert(`No se pudo eliminar de favoritos: ${message}`);
    } finally {
      setRemovingUri(null);
    }
  };

  // ✅ Render vista comentarios (no aplica a artistas)
  if (navigation.view === "comments" && navigation.favorite.content_type !== "artist") {
    const fav = navigation.favorite;
    return (
      <div>
        <FullHeader key={router.pathname}>
          <CommentSection
            spotify_uri={fav.spotify_uri}
            content_type={fav.content_type}
            image_url={fav.image_url}
            title={fav.name}
            onBack={handleBackToList}
          />
        </FullHeader>
        <MusicPlayer />
      </div>
    );
  }

  // 🔥 Render vista detalles
  if (navigation.view === "details") {
    return (
      <div>
        <FullHeader key={router.pathname}>
          <MusicItemDetails
            item={navigation.item}
            itemType={navigation.type}
            onPlayUri={(uri: string) => {
              if (navigation.type === "artist") {
                handlePlayArtistTopTracks(navigation.item.id);
              } else {
                playUri(uri);
              }
            }}
            onBack={handleBackToList}
          />
        </FullHeader>
        <MusicPlayer />
      </div>
    );
  }

  // 🔥 Render vista lista
  return (
    <div>
      <FullHeader key={router.pathname}>
        <div className="tabs-container">
          {["all", "tracks", "albums", "playlists", "artists"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={filter === t ? "tab-button active" : "tab-button inactive"}
            >
              {t === "all"
                ? "Todos"
                : t === "tracks"
                ? "Canciones"
                : t === "albums"
                ? "Álbumes"
                : t === "playlists"
                ? "Playlists"
                : t === "artists"
                ? "Artistas"
                : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : (
          <div className="results-grid">
            {filteredFavorites().length > 0 ? (
              filteredFavorites().map((favorite) => (
                <div
                  key={favorite.spotify_uri}
                  className="result-item"
                  onClick={() => {
                    if (favorite.content_type === "track") {
                      handlePlayTrack(favorite.spotify_uri);
                    } else {
                      handleViewDetails(favorite, favorite.content_type as any);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={favorite.image_url || "https://via.placeholder.com/300x300?text=No+Image"}
                    alt={favorite.name}
                    className="item-image"
                  />
                  <h3 className="item-title">{favorite.name}</h3>
                  <p className="item-subtitle">{favorite.content_type}</p>

                  <div className="item-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (favorite.content_type === "track") {
                          handlePlayTrack(favorite.spotify_uri);
                        } else if (favorite.content_type === "artist") {
                          handlePlayArtistTopTracks(favorite.spotify_uri);
                        } else {
                          playUri(favorite.spotify_uri);
                        }
                      }}
                      className="play-button enabled"
                    >
                      {favorite.content_type === "artist" ? "Reproducir top tracks" : "Reproducir"}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (removingUri === favorite.spotify_uri) return;
                        handleRemoveFavorite(favorite.spotify_uri);
                      }}
                      className="favorite-button"
                      disabled={removingUri === favorite.spotify_uri}
                    >
                      {removingUri === favorite.spotify_uri ? "Eliminando..." : "✅️️"}
                    </button>

                    {/* ✅ Botón comentarios: NO mostrar para artistas */}
                    {favorite.content_type !== "artist" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNavigation({ view: "comments", favorite });
                        }}
                        className="comment-button"
                      >
                        💬 Comentarios
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p>No tienes favoritos de este tipo.</p>
            )}
          </div>
        )}
      </FullHeader>

      <MusicPlayer />
    </div>
  );
};

export default Biblioteca;

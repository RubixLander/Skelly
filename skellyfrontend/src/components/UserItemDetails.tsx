// src/components/UserItemDetails.tsx
import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { useSpotify } from "../context/SpotifyContext";
import MusicItemDetails from "./MusicItemDetails";
import CommentSection from "./commentsSection";
import MusicPlayer from "./SpotifyPlayer";
import "../styles/UserItemDetails.css";

interface UserItemDetailsProps {
  user: {
    user_id: string;
    nickname: string;
    bio?: string;
    custom_profile_image_url?: string;
    followers?: { user_id: string; nickname: string; custom_profile_image_url?: string }[];
    following?: { user_id: string; nickname: string; custom_profile_image_url?: string }[];
    favorites?: {
      spotify_uri: string;
      name: string;
      content_type: string;
      image_url?: string;
    }[];
    groups?: {
      group_id: string;
      name: string;
      description?: string;
    }[];
  };
  onBack: () => void;
  // 👇 nuevo callback
  onSelectUser?: (userId: string) => void;
}

type NavigationState =
  | { view: "list" }
  | { view: "details"; item: any; type: "artist" | "album" | "playlist" }
  | { view: "comments"; favorite: any };

const UserItemDetails: React.FC<UserItemDetailsProps> = ({ user, onBack, onSelectUser }) => {
  const followers = user.followers || [];
  const following = user.following || [];
  const favorites = user.favorites || [];
  const groups = user.groups || [];

  const { user: loggedUser } = useUser();
  const { playUri } = useSpotify();

  const [activeTab, setActiveTab] = useState<"groups" | "followers" | "following" | "library">("groups");
  const [filter, setFilter] = useState<"all" | "tracks" | "albums" | "playlists" | "artists">("all");

  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());
  const [loadingFavorite, setLoadingFavorite] = useState<string | null>(null);

  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [loadingFollow, setLoadingFollow] = useState<boolean>(false);

  const [navigation, setNavigation] = useState<NavigationState>({ view: "list" });

  // ✅ helpers
  const extractSpotifyId = (uri: string) => {
    if (!uri) return null;
    const parts = uri.split(":");
    return parts.length > 0 ? parts.pop() : null;
  };

  // ✅ verificar follow
  useEffect(() => {
    if (loggedUser && followers.some((f) => f.user_id === loggedUser.user_id)) {
      setIsFollowing(true);
    }
  }, [loggedUser, followers]);

  const handleFollowToggle = async () => {
    if (!loggedUser) {
      alert("Debes iniciar sesión para seguir a otros usuarios.");
      return;
    }
    setLoadingFollow(true);
    try {
      const dto = { follower_id: loggedUser.user_id, following_id: user.user_id };
      if (isFollowing) {
        const res = await fetch("http://localhost:3001/users-details/unfollow", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        });
        if (res.ok) setIsFollowing(false);
      } else {
        const res = await fetch("http://localhost:3001/users-details/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        });
        if (res.ok) setIsFollowing(true);
      }
    } catch (err) {
      console.error("Error en follow/unfollow:", err);
    } finally {
      setLoadingFollow(false);
    }
  };

  // ✅ cargar favoritos propios
  const loadFavorites = async () => {
    if (loggedUser) {
      try {
        const response = await fetch(`http://localhost:3001/user-favorites/${loggedUser.user_id}`);
        const data = await response.json();
        setFavoritesSet(new Set(data.map((item: { spotify_uri: string }) => item.spotify_uri)));
      } catch (err) {
        console.error("Error al cargar favoritos:", err);
      }
    }
  };
  useEffect(() => {
    loadFavorites();
  }, [loggedUser]);

  const handleFavoriteToggle = async (
    contentType: "track" | "album" | "artist" | "playlist",
    spotifyUri: string,
    name: string,
    imageUrl: string
  ) => {
    if (!loggedUser) {
      alert("Debes iniciar sesión para guardar favoritos.");
      return;
    }
    setLoadingFavorite(spotifyUri);
    try {
      const isFavorite = favoritesSet.has(spotifyUri);
      if (isFavorite) {
        const res = await fetch(
          `http://localhost:3001/user-favorites/${loggedUser.user_id}?spotify_uri=${spotifyUri}`,
          { method: "DELETE", headers: { "Content-Type": "application/json" } }
        );
        if (res.ok) {
          setFavoritesSet((prev) => {
            const newSet = new Set(prev);
            newSet.delete(spotifyUri);
            return newSet;
          });
        }
      } else {
        const res = await fetch("http://localhost:3001/user-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: loggedUser.user_id,
            content_type: contentType,
            spotify_uri: spotifyUri,
            name,
            image_url: imageUrl,
          }),
        });
        if (res.ok) {
          setFavoritesSet((prev) => new Set(prev).add(spotifyUri));
        }
      }
    } catch (err) {
      console.error("Error al modificar favorito:", err);
    } finally {
      setLoadingFavorite(null);
    }
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
      if (!response.ok) throw new Error("Error al obtener detalles de Spotify");
      const fullData = await response.json();
      if (type === "artist" && fullData.topTracks && fullData.topTracks.length > 0) {
        playUri(fullData.topTracks[0].uri);
      }
      setNavigation({ view: "details", item: fullData, type });
    } catch (err) {
      console.error("❌ Error cargando detalles:", err);
    }
  };

  const handlePlayTrack = (spotifyUri: string) => playUri(spotifyUri);

  const handlePlayArtistTopTracks = (artistIdOrUri: string) => {
    const artistId = extractSpotifyId(artistIdOrUri) || artistIdOrUri;
    playUri(`spotify:artist:${artistId}`);
  };

  const filteredFavorites = () => {
    if (filter === "all") return favorites;
    return favorites.filter((f) => f.content_type === filter.slice(0, -1));
  };

  // ✅ navegación condicional
  if (navigation.view === "comments" && navigation.favorite.content_type !== "artist") {
    const fav = navigation.favorite;
    return (
      <div>
        <CommentSection
          spotify_uri={fav.spotify_uri}
          content_type={fav.content_type}
          image_url={fav.image_url}
          title={fav.name}
          onBack={() => setNavigation({ view: "list" })}
        />
        <MusicPlayer />
      </div>
    );
  }

  if (navigation.view === "details") {
    return (
      <div>
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
          onBack={() => setNavigation({ view: "list" })}
        />
        <MusicPlayer />
      </div>
    );
  }

  return (
    <div className="user-details-container">
      <button onClick={onBack} className="tab-button back-button">
        ← Volver
      </button>


      <div className="user-header">
        <img
          src={user.custom_profile_image_url || "/profile.png"}
          alt={user.nickname}
          className="user-avatar"
        />
        <div className="user-info">
            <h2>{user.nickname}</h2>
            {user.bio && <p className="user-bio">{user.bio}</p>}
            {loggedUser && loggedUser.user_id !== user.user_id && (
              <button
                onClick={handleFollowToggle}
                disabled={loadingFollow}
                className={`tab-button follow-button ${isFollowing ? "active" : ""}`}
              >
                {loadingFollow ? "..." : isFollowing ? "Dejar de seguir" : "Seguir"}
              </button>
            )}
          </div>
        </div>

      {/* pestañas */}
      <div className="tabs-container">
        <button className={activeTab === "groups" ? "tab-button active" : "tab-button"} onClick={() => setActiveTab("groups")}>
          Grupos ({groups.length})
        </button>
        <button className={activeTab === "followers" ? "tab-button active" : "tab-button"} onClick={() => setActiveTab("followers")}>
          Seguidores ({followers.length})
        </button>
        <button className={activeTab === "following" ? "tab-button active" : "tab-button"} onClick={() => setActiveTab("following")}>
          Siguiendo ({following.length})
        </button>
        <button className={activeTab === "library" ? "tab-button active" : "tab-button"} onClick={() => setActiveTab("library")}>
          Biblioteca
        </button>
      </div>

      {/* contenido de pestañas */}
      <div className="tab-content">
        {activeTab === "library" && (
          <div>
            <h3>Biblioteca</h3>
            <div className="tabs-container">
              {["all", "tracks", "albums", "playlists", "artists"].map((t) => (
                <button key={t} onClick={() => setFilter(t as any)} className={filter === t ? "tab-button active" : "tab-button"}>
                  {t === "all" ? "Todos" : t === "tracks" ? "Canciones" : t === "albums" ? "Álbumes" : t === "playlists" ? "Playlists" : "Artistas"}
                </button>
              ))}
            </div>

            <div className="results-grid">
              {filteredFavorites().length > 0 ? (
                filteredFavorites().map((fav) => {
                  const isFavorite = favoritesSet.has(fav.spotify_uri);
                  return (
                    <div
                      key={fav.spotify_uri}
                      className="result-item"
                      onClick={() => {
                        if (fav.content_type === "track") {
                          handlePlayTrack(fav.spotify_uri);
                        } else {
                          handleViewDetails(fav, fav.content_type as any);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <img
                        src={fav.image_url || "https://via.placeholder.com/300x300?text=No+Image"}
                        alt={fav.name}
                        className="item-image"
                      />
                      <h4>{fav.name}</h4>
                      <p>{fav.content_type}</p>

                      <div className="item-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fav.content_type === "track") {
                              handlePlayTrack(fav.spotify_uri);
                            } else if (fav.content_type === "artist") {
                              handlePlayArtistTopTracks(fav.spotify_uri);
                            } else {
                              playUri(fav.spotify_uri);
                            }
                          }}
                          className="play-button enabled"
                        >
                          {fav.content_type === "artist" ? "Reproducir top tracks" : "Reproducir"}
                        </button>

                        {fav.content_type !== "artist" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNavigation({ view: "comments", favorite: fav });
                            }}
                            className="comment-button"
                          >
                            💬 Comentarios
                          </button>
                        )}

                        <button
                          className={`favorite-button ${isFavorite ? "favorited" : ""}`}
                          disabled={loadingFavorite === fav.spotify_uri}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFavoriteToggle(
                              fav.content_type as any,
                              fav.spotify_uri,
                              fav.name,
                              fav.image_url || ""
                            );
                          }}
                        >
                          {loadingFavorite === fav.spotify_uri ? "..." : isFavorite ? "✅️️" : "➕"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p>No tiene favoritos en su biblioteca.</p>
              )}
            </div>
            <MusicPlayer />
          </div>
        )}

        {activeTab === "groups" && (
          <div>
            <h3>Grupos</h3>
            {groups.length > 0 ? (
              groups.map((g) => (
                <div key={g.group_id} className="group-mini-card">
                  <h4>{g.name}</h4>
                  <p>{g.description || "Sin descripción."}</p>
                </div>
              ))
            ) : (
              <p>No pertenece a ningún grupo.</p>
            )}
          </div>
        )}

        {activeTab === "followers" && (
          <div>
            <h3>Seguidores</h3>
            {followers.length > 0 ? (
              followers.map((f) => (
                <div
                  key={f.user_id}
                  className="user-mini-card"
                  onClick={() => onSelectUser && onSelectUser(f.user_id)} // 👈 navegar al perfil
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={f.custom_profile_image_url || "/profile.png"}
                    alt={f.nickname}
                    className="mini-avatar"
                  />
                  <span>{f.nickname}</span>
                </div>
              ))
            ) : (
              <p>No tiene seguidores.</p>
            )}
          </div>
        )}

        {activeTab === "following" && (
          <div>
            <h3>Siguiendo</h3>
            {following.length > 0 ? (
              following.map((f) => (
                <div
                  key={f.user_id}
                  className="user-mini-card"
                  onClick={() => onSelectUser && onSelectUser(f.user_id)} // 👈 navegar al perfil
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={f.custom_profile_image_url || "/profile.png"}
                    alt={f.nickname}
                    className="mini-avatar"
                  />
                  <span>{f.nickname}</span>
                </div>
              ))
            ) : (
              <p>No sigue a nadie.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserItemDetails;
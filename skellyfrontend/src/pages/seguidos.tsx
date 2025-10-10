import React, { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import UserItemDetails from "../components/UserItemDetails";
import CommentSection from "../components/commentsSection";
import { fetchSpotifyData } from "../utils/spotifyHelpers";
import "../styles/seguidos.css";
import FullHeader from "../components/Fullheader";

type NavigationState =
  | { view: "list" }
  | { view: "userDetails"; user: any }
  | { view: "commentSection"; pub: any };

const Seguidos: React.FC = () => {
  const { user: loggedUser } = useUser();
  const [activeTab, setActiveTab] = useState<"seguidos" | "publicaciones">("seguidos");
  const [following, setFollowing] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [navigation, setNavigation] = useState<NavigationState>({ view: "list" });

  useEffect(() => {
    const loadFollowing = async () => {
      if (!loggedUser) return;
      const res = await fetch(`http://localhost:3001/users-details/${loggedUser.user_id}`);
      const data = await res.json();
      setFollowing(data.following || []);
    };
    loadFollowing();
  }, [loggedUser]);

  useEffect(() => {
    const loadComments = async () => {
      if (!loggedUser || activeTab !== "publicaciones") return;
      const res = await fetch(
        `http://localhost:3001/users-details/${loggedUser.user_id}/comments`
      );
      const data = await res.json();

      const token = localStorage.getItem("spotify_access_token") || "";
      const enriched = await Promise.all(
        data.map(async (c: any) => {
          try {
            if (!c.spotify_uri) throw new Error("Spotify URI inválida");
            const spotifyData = await fetchSpotifyData(
              c.spotify_uri,
              c.content_type,
              token
            );

            let title = "Desconocido";
            let image_url = "/no-cover.png";

            if (c.content_type === "track") {
              const artistName = spotifyData.artists?.[0]?.name || "Artista desconocido";
              title = `${spotifyData.name || "Desconocido"} - ${artistName}`;
              image_url =
                spotifyData.album?.images?.[0]?.url ||
                "https://via.placeholder.com/300?text=No+Cover";
            } else if (["album", "playlist"].includes(c.content_type)) {
              title = spotifyData.name || "Desconocido";
              image_url =
                spotifyData.images?.[0]?.url ||
                "https://via.placeholder.com/300?text=No+Cover";
            }

            return { ...c, title, image_url };
          } catch {
            return { ...c, title: "Desconocido", image_url: "/no-cover.png" };
          }
        })
      );

      setComments(enriched);
    };
    loadComments();
  }, [loggedUser, activeTab]);

  useEffect(() => {
    if (navigation.view === "commentSection") window.scrollTo({ top: 0 });
  }, [navigation.view]);

  return (
    <FullHeader hideTabs>
      {/* ✅ Solo renderiza la sección de Seguidos si no estás en la sección de comentarios */}
      {navigation.view !== "commentSection" && (
        <div className="seguidos-page">
          {navigation.view === "list" && (
            <div className="seguidos-container">
              <div className="tabs-container">
                <button
                  className={activeTab === "seguidos" ? "tab-button active" : "tab-button"}
                  onClick={() => setActiveTab("seguidos")}
                >
                  Seguidos
                </button>
                <button
                  className={activeTab === "publicaciones" ? "tab-button active" : "tab-button"}
                  onClick={() => setActiveTab("publicaciones")}
                >
                  Publicaciones
                </button>
              </div>

              {activeTab === "seguidos" && (
                <div>
                  <h3>Usuarios que sigues</h3>
                  {following.length > 0 ? (
                    <div className="results-grid">
                      {following.map((f) => (
                        <div
                          key={f.user_id}
                          className="result-item"
                          onClick={() =>
                            setNavigation({ view: "userDetails", user: f })
                          }
                        >
                          <img
                            src={f.custom_profile_image_url || "/profile.png"}
                            alt={f.nickname}
                            className="item-image"
                          />
                          <p className="item-title">{f.nickname}</p>
                          <p className="item-subtitle">{f.display_email}</p>
                          {f.bio && <p className="item-subtitle">{f.bio}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No sigues a nadie aún.</p>
                  )}
                </div>
              )}

              {activeTab === "publicaciones" && (
                <div>
                  <h3>Publicaciones de tus seguidos</h3>
                  {comments.length > 0 ? (
                    <div className="comments-list">
                      {comments.map((c) => (
                        <div
                          key={c.id}
                          className="comment-item"
                          onClick={() =>
                            setNavigation({ view: "commentSection", pub: c })
                          }
                        >
                          <img
                            src={c.custom_profile_image_url || "/profile.png"}
                            alt={c.nickname}
                            className="comment-avatar"
                          />
                          <div className="comment-content">
                            <p className="comment-user">{c.nickname}</p>
                            <p className="comment-text">{c.comment}</p>
                            <div className="comment-media">
                              <img
                                src={c.image_url}
                                alt={c.title}
                                className="album-cover"
                              />
                              <div>
                                <p className="comment-title">{c.title}</p>
                                <small>{c.content_type.toUpperCase()}</small>
                              </div>
                            </div>
                            <small className="comment-meta">
                              {new Date(c.created_at).toLocaleString()}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No hay comentarios recientes de tus seguidos.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {navigation.view === "userDetails" && (
            <UserItemDetails
              user={navigation.user}
              onBack={() => setNavigation({ view: "list" })}
              onSelectUser={() => {}}
            />
          )}
        </div>
      )}

      {/* ✅ CommentSection completamente fuera del alcance de .seguidos-page */}
      {navigation.view === "commentSection" && (
        <div className="comment-section-wrapper">
          <CommentSection
            spotify_uri={navigation.pub.spotify_uri}
            content_type={navigation.pub.content_type}
            image_url={navigation.pub.image_url}
            title={navigation.pub.title}
            onBack={() => setNavigation({ view: "list" })}
          />
        </div>
      )}
    </FullHeader>
  );
};

export default Seguidos;

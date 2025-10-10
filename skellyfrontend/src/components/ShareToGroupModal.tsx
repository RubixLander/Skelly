import React, { useEffect, useState } from "react";
import axios from "axios";

type Props = {
  open: boolean;
  onClose: () => void;
  spotifyUri: string;
  contentType: string; // 'track'|'album'|'playlist'|'artist'
  userId?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001/api/groups";

const ShareToGroupModal: React.FC<Props> = ({ open, onClose, spotifyUri, contentType, userId }) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    setError(null);
    axios
      .get(`${API_BASE}/user/${encodeURIComponent(userId)}`)
      .then((res) => setGroups(res.data || []))
      .catch((err) => {
        console.error("Error fetching user groups:", err);
        setError("No se pudieron obtener tus comunidades");
      });
  }, [open, userId]);

  const shareToGroup = async (groupId: string) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/${encodeURIComponent(groupId)}/shared`, {
        spotify_uri: spotifyUri,
        content_type: contentType,
        user_id: userId, // ✅ agregado para evitar error 400
      });
      alert("Contenido compartido en la comunidad");
      onClose();
    } catch (err: any) {
      console.error("Share to group error:", err);
      const msg = err.response?.data?.message || "Error compartiendo en la comunidad";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const broadcast = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/shared/broadcast`, {
        spotify_uri: spotifyUri,
        content_type: contentType,
        user_id: userId,
      });
      alert("Contenido compartido en todas tus comunidades");
      onClose();
    } catch (err) {
      console.error("Broadcast error:", err);
      alert("Error enviando a tus comunidades");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 420,
          background: "#0b0b0b",
          color: "white",
          borderRadius: 8,
          padding: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <h3>Compartir en comunidades</h3>
        <p style={{ fontSize: 13 }}>Contenido: {spotifyUri}</p>

        {error && <p style={{ color: "salmon" }}>{error}</p>}

        <div style={{ marginTop: 8 }}>
          <strong>Tus comunidades</strong>
          {groups.length === 0 ? (
            <p style={{ color: "#aaa" }}>No perteneces a comunidades</p>
          ) : (
            <div style={{ maxHeight: 200, overflow: "auto", marginTop: 8 }}>
              {groups.map((g) => (
                <div
                  key={g.group_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <img
                      src={g.image_url || "/comunidad.jpg"}
                      alt={g.name}
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: "cover",
                        borderRadius: 6,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 14 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: "#999" }}>{g.description || ""}</div>
                    </div>
                  </div>
                  <div>
                    <button
                      disabled={loading}
                      onClick={() => shareToGroup(g.group_id)}
                      style={{
                        padding: "6px 10px",
                        background: "#1db954",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Compartir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <button
            disabled={loading}
            onClick={broadcast}
            style={{
              marginRight: 8,
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "6px 10px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Compartir en todas mis comunidades
          </button>
          <button
            onClick={onClose}
            style={{
              marginLeft: 8,
              background: "#444",
              color: "white",
              border: "none",
              padding: "6px 10px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareToGroupModal;
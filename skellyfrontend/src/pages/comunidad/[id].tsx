import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import { useUser } from "../../context/UserContext";
import styles from "../../styles/ChatGrupo.module.css";

type Message = {
  id?: number;
  group_id: string;
  user_id: string;
  user_name?: string;
  message?: string;
  created_at?: string;
  spotify_uri?: string;
  nickname?: string;
};

type Grupo = {
  group_id: string;
  owner_id: string;
  name: string;
  description?: string;
  image_url?: string;
  members?: any[];
};

const ChatGrupo = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [mensajes, setMensajes] = useState<Message[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [esMiembro, setEsMiembro] = useState(false);
  const [miembros, setMiembros] = useState<any[]>([]);
  const [nombreDueno, setNombreDueno] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [mensajes]);

  // 🔹 Cargar grupo, miembros, mensajes y contenido compartido
  useEffect(() => {
    if (!id || !user) return;

    const cargarDatos = async () => {
      try {
        const [grupoRes, miembrosRes, mensajesRes, sharedRes] = await Promise.all([
          axios.get(`http://localhost:3001/api/groups/${id}`),
          axios.get(`http://localhost:3001/api/groups/${id}/members`),
          axios.get(`http://localhost:3001/api/groups/${id}/messages`),
          axios.get(`http://localhost:3001/api/groups/${id}/shared`),
        ]);

        const todos = [
          ...mensajesRes.data.map((m: any) => ({ ...m, type: "message" })),
          ...sharedRes.data.map((s: any) => ({ ...s, type: "shared" })),
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        setGrupo(grupoRes.data);
        setMiembros(miembrosRes.data);
        setMensajes(todos);

        const esMiembroActual = miembrosRes.data.some((m: any) => m.user_id === user.user_id);
        setEsMiembro(esMiembroActual);

        const dueno = miembrosRes.data.find((m: any) => m.user_id === grupoRes.data.owner_id);
        if (dueno) setNombreDueno(dueno.nickname || dueno.user_name || "Desconocido");
      } catch (err) {
        console.error("❌ Error cargando datos del grupo:", err);
      }
    };

    cargarDatos();
  }, [id, user]);

  // 🔹 Socket.io
  useEffect(() => {
    if (!id || !user) return;
    const socket = io("http://localhost:3001/groups", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("group:join", { groupId: id });
    });

    socket.on("group:message:new", (msg: Message) => {
      setMensajes((prev) => {
        const existe = prev.some((m) => m.id === msg.id);
        if (existe) return prev;
        return [...prev, { ...msg, type: "message" }];
      });
    });

    // 👇 Nuevo: escuchar contenido compartido
    socket.on("group:shared:new", (shared: any) => {
      console.log("🎵 Nuevo contenido compartido:", shared);
      setMensajes((prev) => [
        ...prev,
        { ...shared, type: "shared" },
      ]);
    });

    return () => {
      socket.emit("group:leave", { groupId: id });
      socket.disconnect();
    };
  }, [id, user]);

  // 🔹 Unirse / Salir
  const handleUnirse = async () => {
    try {
      await axios.post(`http://localhost:3001/api/groups/${id}/join`, { user_id: user?.user_id });
      setEsMiembro(true);
      const res = await axios.get(`http://localhost:3001/api/groups/${id}/members`);
      setMiembros(res.data);
    } catch (err) {
      console.error("❌ Error al unirse:", err);
      alert("Error al unirse a la comunidad.");
    }
  };

  const handleSalir = async () => {
    if (!confirm("¿Seguro que quieres salir de la comunidad?")) return;
    try {
      await axios.post(`http://localhost:3001/api/groups/${id}/leave`, { user_id: user?.user_id });
      setEsMiembro(false);
      const res = await axios.get(`http://localhost:3001/api/groups/${id}/members`);
      setMiembros(res.data);
    } catch (err) {
      console.error("❌ Error al salir:", err);
      alert("Error al salir de la comunidad.");
    }
  };

  // 🔹 Enviar mensaje
  const handleSend = () => {
    if (!nuevoMensaje.trim() || !user || !socketRef.current || !esMiembro) return;

    const msgData: Message = {
      group_id: id as string,
      user_id: user.user_id,
      user_name: user.name,
      nickname: user.nickname,
      message: nuevoMensaje.trim(),
      created_at: new Date().toISOString(),
    };

    socketRef.current.emit("sendMessage", msgData);
    setNuevoMensaje("");
  };

  if (!grupo) return <div className="text-white p-8">Cargando grupo...</div>;

  const imagenGrupo = grupo.image_url?.trim() ? grupo.image_url : "/comunidad.jpg";
  const esOwner = user?.user_id === grupo.owner_id;

  return (
    <div className={styles["chat-container"]}>
      {/* HEADER */}
      <div className={styles["chat-header"]}>
        <img src={imagenGrupo} alt={grupo.name} />
        <div style={{ flex: 1 }}>
          <h1>{grupo.name}</h1>
          <p>{grupo.description}</p>
        </div>

        <button
          onClick={() => router.push("/comunidades")}
          style={{
            background: "#374045",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          ← Volver
        </button>
      </div>

      {/* OPCIONES */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "#202c33",
        }}
      >
        {!esMiembro ? (
          <button
            onClick={handleUnirse}
            style={{
              background: "#027a64",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              color: "white",
            }}
          >
            Unirse a la comunidad
          </button>
        ) : (
          <button
            onClick={handleSalir}
            style={{
              background: "#a63131",
              border: "none",
              padding: "8px 14px",
              borderRadius: "8px",
              color: "white",
            }}
          >
            Salir de la comunidad
          </button>
        )}

        <button
          onClick={() => router.push(`/comunidad/${id}/settings`)}
          style={{
            background: "#374045",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Ajustes
        </button>
      </div>

      {/* CHAT */}
      <div className={styles["chat-body"]}>
        {mensajes.length === 0 ? (
          <p className="text-gray-400">No hay mensajes todavía.</p>
        ) : (
          mensajes.map((m, i) => (
            <div
              key={m.id ?? i}
              className={`${styles["message-wrapper"]} ${
                m.user_id === user?.user_id ? styles["sent"] : styles["received"]
              }`}
            >
              <div
                className={`${styles["message"]} ${
                  m.user_id === user?.user_id ? styles["sent"] : styles["received"]
                }`}
              >
                <p className={styles["sender"]}>{m.nickname || m.user_name}</p>

                {/* 🎵 Mostrar Spotify o texto */}
                {m.spotify_uri ? (
                  <iframe
                    src={`https://open.spotify.com/embed/${m.spotify_uri
                      .replace("spotify:", "")
                      .replace(/:/g, "/")}`}
                    width="300"
                    height="80"
                    frameBorder="0"
                    allow="encrypted-media"
                    style={{ borderRadius: "12px", marginTop: "6px" }}
                  ></iframe>
                ) : (
                  <p className={styles["text"]}>{m.message}</p>
                )}

                <span className={styles["time"]}>
                  {new Date(m.created_at ?? "").toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* INPUT */}
      <div className={styles["chat-input"]}>
        <input
          type="text"
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          placeholder={
            esMiembro ? "Escribe un mensaje..." : "Únete para enviar mensajes..."
          }
          disabled={!esMiembro}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend} disabled={!esMiembro}>
          ➤
        </button>
      </div>
    </div>
  );
};

export default ChatGrupo;

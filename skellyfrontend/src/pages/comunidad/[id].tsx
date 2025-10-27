import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import io from "socket.io-client";
import axios, { AxiosError } from "axios";
import { useUser } from "../../context/UserContext";
import styles from "../../styles/ChatGrupo.module.css";
import { usePlayer } from "../../context/PlayerContext";
import CommentSection from '../../components/commentsSection';

// --- Interfaces y Tipos (MODIFICADO) ---

type Message = {
    id?: number;
    group_id: string;
    user_id: string;
    user_name?: string;
    message?: string;
    created_at?: string;
    spotify_uri?: string;
    nickname?: string;

    // 🏆 NUEVOS CAMPOS PARA EL CACHÉ DE INFO DE SPOTIFY
    spotify_details_loaded?: boolean;
    spotify_image_url?: string;
    spotify_title?: string;
    spotify_content_type?: 'track' | 'album' | 'playlist' | 'artist' | 'unknown'; // Aseguramos el tipo 'unknown'
};

type Grupo = {
    group_id: string;
    owner_id: string;
    name: string;
    description?: string;
    image_url?: string;
    members?: any[];
};

interface ChatGrupoProps {
    onViewDetails: (uri: string, type: 'track' | 'album' | 'playlist' | 'artist') => void;
}

interface CommentItemDetails {
    spotify_uri: string;
    content_type: 'track' | 'album' | 'playlist';
    image_url: string;
    title: string;
}

// 2. FUNCIONES AUXILIARES (Estrategia de URIs de Biblioteca)

const extractSpotifyId = (uri: string): string | null => {
    if (!uri) return null;
    const parts = uri.split(":");
    return parts.length === 3 ? parts.pop()! : null;
};

const inferContentType = (uri: string): 'track' | 'album' | 'playlist' | 'artist' | 'unknown' => {
    if (uri.startsWith('spotify:track:')) return 'track';
    if (uri.startsWith('spotify:album:')) return 'album';
    if (uri.startsWith('spotify:playlist:')) return 'playlist';
    if (uri.startsWith('spotify:artist:')) return 'artist';
    return 'unknown';
};

const formatChatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getDayString = (dateString: string): string => {
    const date = new Date(dateString || new Date());
    return date.toDateString();
};


// 3. DEFINICIÓN DEL COMPONENTE CON PROPS Y LÓGICA COMPLETA
const ChatGrupo: React.FC<ChatGrupoProps> = ({ onViewDetails }) => {
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
    const { handlePlayUri } = usePlayer();

    // 🔹 ESTADOS NECESARIOS PARA LOS COMENTARIOS
    const [showComments, setShowComments] = useState(false);
    const [commentItemDetails, setCommentItemDetails] = useState<CommentItemDetails | null>(null);


    const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [mensajes]);

    // 🏆 FUNCIÓN FINAL QUE UTILIZA LA ESTRATEGIA DE BIBLIOTECA: /spotify/type/id
    const fetchItemDetails = async (uri: string, type: 'track' | 'album' | 'playlist' | 'artist'): Promise<CommentItemDetails> => {
        
        const content_type = (type !== 'artist' ? type : 'track') as 'track' | 'album' | 'playlist';
        const spotifyId = extractSpotifyId(uri);

        if (!spotifyId || type === 'unknown' || type === 'artist') {
             return { spotify_uri: uri, content_type: content_type, image_url: '/default-image.png', title: 'Error: URI o tipo no válido.' };
        }

        try {
            // Usamos el patrón de URL de Biblioteca: http://localhost:3001/spotify/type/ID
            const endpoint = `http://localhost:3001/spotify/${type}/${spotifyId}`; 
            
            const res = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
            });
            
            const data = res.data;
            
            let imageUrl = '/default-image.png';
            let titleText = 'Contenido de Spotify';

            if (data) {
                // Lógica de extracción de imagen (robusta)
                if (data.images && data.images.length > 0) {
                    imageUrl = data.images[0].url;
                } else if (data.album?.images && data.album.images.length > 0) {
                    imageUrl = data.album.images[0].url;
                }
                
                // Lógica de extracción del título
                titleText = data.name || data.title || 'Contenido de Spotify';

                if (type === 'track' && data.artists?.length > 0) {
                    const artists = data.artists.map((a: any) => a.name).join(', ');
                    titleText = `${data.name} - ${artists}`; 
                }
            }

            return { spotify_uri: uri, content_type, image_url: imageUrl, title: titleText };

        } catch (error) {
            let errorTitle = 'Detalles no disponibles (Error de conexión)';
            let status = '';

            if (axios.isAxiosError(error) && error.response) {
                status = ` (Error ${error.response.status} en la API)`;
                console.error(`❌ Error al obtener detalles de Spotify (API): ${type}/${spotifyId}`, error.response.status);
            } else {
                 console.error("❌ Error al obtener detalles de Spotify:", error);
            }
            
            return {
                spotify_uri: uri,
                content_type, 
                image_url: '/default-image.png',
                title: errorTitle + status,
            };
        }
    };

    // 🔹 FUNCIÓN PARA ABRIR LA SECCIÓN DE COMENTARIOS
    const handleViewComments = async (uri: string, type: 'track' | 'album' | 'playlist' | 'artist') => {
        if (type === 'artist') {
            alert('Los comentarios no están disponibles para artistas en este momento.');
            return;
        }

        const details = await fetchItemDetails(uri, type);
        setCommentItemDetails(details);
        setShowComments(true);
    };

    // 🔹 FUNCIÓN PARA VOLVER AL CHAT
    const handleBackToChat = () => {
        setShowComments(false);
        setCommentItemDetails(null);
    };


    // 🔹 Cargar grupo, miembros, mensajes y contenido compartido (MODIFICADO)
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

                const rawMessages = [
                    ...mensajesRes.data.map((m: any) => ({ ...m, type: "message" })),
                    ...sharedRes.data.map((s: any) => ({ ...s, type: "shared" })),
                ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                // 🌟 PROCESAR DETALLES DE SPOTIFY PARA TODOS LOS MENSAJES COMPARTIDOS
                const messagesWithDetails = await Promise.all(rawMessages.map(async (m: Message) => {
                    if (m.spotify_uri) {
                        const type = inferContentType(m.spotify_uri);
                        if (type !== 'unknown') {
                            const details = await fetchItemDetails(m.spotify_uri, type as any); 
                            return { 
                                ...m, 
                                spotify_details_loaded: true,
                                spotify_image_url: details.image_url,
                                spotify_title: details.title,
                                spotify_content_type: details.content_type,
                            };
                        }
                    }
                    return m;
                }));

                setGrupo(grupoRes.data);
                setMiembros(miembrosRes.data);
                setMensajes(messagesWithDetails); // Establecemos los mensajes con los detalles cargados

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

    // 🔹 Socket.io (MODIFICADO)
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

        // 🚨 MODIFICACIÓN: Obtener detalles para el nuevo contenido compartido
        socket.on("group:shared:new", async (shared: any) => { 
            console.log("🎵 Nuevo contenido compartido:", shared);
            
            let messageWithDetails: Message = { ...shared, type: "shared" };

            if (shared.spotify_uri) {
                const type = inferContentType(shared.spotify_uri);
                if (type !== 'unknown') {
                    const details = await fetchItemDetails(shared.spotify_uri, type as any); 
                    messageWithDetails = { 
                        ...messageWithDetails, 
                        spotify_details_loaded: true,
                        spotify_image_url: details.image_url,
                        spotify_title: details.title,
                        spotify_content_type: details.content_type,
                    };
                }
            }

            setMensajes((prev) => [
                ...prev,
                messageWithDetails,
            ]);
        });

        return () => {
            socket.emit("group:leave", { groupId: id });
            socket.disconnect();
        };
    }, [id, user]);

    // 🔹 Unirse / Salir (se mantiene)
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

    // 🔹 Enviar mensaje (se mantiene)
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

    // 🚀 RENDERIZADO CONDICIONAL: Mostrar Comentarios si es necesario
    if (showComments && commentItemDetails) {
        return (
            <CommentSection 
                spotify_uri={commentItemDetails.spotify_uri}
                content_type={commentItemDetails.content_type}
                image_url={commentItemDetails.image_url}
                title={commentItemDetails.title}
                onBack={handleBackToChat} // Función para volver al chat
            />
        );
    }
    
    // 💬 RENDERIZADO DEL CHAT
    const imagenGrupo = grupo.image_url?.trim() ? grupo.image_url : "/comunidad.jpg";
    const esOwner = user?.user_id === grupo.owner_id;

    return (
        <div className={styles["chat-container"]}>
            {/* ... HEADER y OPCIONES se mantienen igual ... */}
            <div className={styles["chat-header"]}>
                <img src={imagenGrupo} alt={grupo.name} />
                <div style={{ flex: 1 }}>
                    <h1>{grupo.name}</h1>
                    <p>{grupo.description}</p>
                </div>

                <button
                    onClick={() => router.push("/comunidades")}
                    style={{ background: "#374045", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}
                >
                    ← Volver
                </button>
            </div>
            <div
                style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", background: "#202c33" }}
            >
                {!esMiembro ? (
                    <button onClick={handleUnirse} style={{ background: "#027a64", border: "none", padding: "8px 14px", borderRadius: "8px", color: "white" }}>
                        Unirse a la comunidad
                    </button>
                ) : (
                    <button onClick={handleSalir} style={{ background: "#a63131", border: "none", padding: "8px 14px", borderRadius: "8px", color: "white" }}>
                        Salir de la comunidad
                    </button>
                )}
                <button onClick={() => router.push(`/comunidad/${id}/settings`)} style={{ background: "#374045", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}>
                    Ajustes
                </button>
            </div>

            {/* CHAT */}
            <div className={styles["chat-body"]}>
                {mensajes.length === 0 ? (
                    <p className="text-gray-400">No hay mensajes todavía.</p>
                ) : (
                    mensajes.map((m, i) => {
                        const contentType = m.spotify_uri ? inferContentType(m.spotify_uri) : 'unknown';
                        const isCommentable = ['track', 'album', 'playlist'].includes(contentType);

                        // Lógica de fecha para el separador
                        const currentDate = getDayString(m.created_at ?? '');
                        const prevDate = i > 0 ? getDayString(mensajes[i - 1].created_at ?? '') : '';
                        const showDateSeparator = currentDate !== prevDate;

                        return (
                            <React.Fragment key={m.id ?? i}>
                                {/* 📅 Separador de fecha Condicional */}
                                {showDateSeparator && (
                                    <div className={styles["date-separator"]}>
                                        <span>{formatChatDate(m.created_at ?? '')}</span>
                                    </div>
                                )}

                                <div
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

                                        {/* 🎵 Mostrar Spotify o texto (MODIFICADO) */}
                                        {m.spotify_uri ? (
                                            <div style={{ padding: '4px', maxWidth: '300px', borderRadius: '8px' }}>
                                                
                                                {/* 🌟 Tarjeta de Contenido de Spotify con imagen y título */}
                                                {(m.spotify_image_url && m.spotify_title) ? (
                                                    <div 
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            marginBottom: '8px',
                                                            gap: '8px',
                                                            background: '#3e4a52', 
                                                            borderRadius: '8px', 
                                                            padding: '8px', 
                                                            cursor: 'pointer' 
                                                        }}
                                                        onClick={() => handlePlayUri(m.spotify_uri as string)}
                                                    >
                                                        <img 
                                                            src={m.spotify_image_url} 
                                                            alt={m.spotify_title} 
                                                            style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} 
                                                        />
                                                        <p style={{ margin: 0, color: 'white', fontSize: '14px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {m.spotify_title}
                                                        </p>
                                                        <span style={{ color: '#1db954', marginLeft: 'auto', fontSize: '18px' }}>▶</span>
                                                    </div>
                                                ) : (
                                                    // Mensaje de carga si los detalles aún no están
                                                    <p style={{ color: '#ccc', fontSize: '12px' }}>Cargando detalles de Spotify...</p>
                                                )}
                                                
                                                {/* **BLOQUE ELIMINADO:** Se elimina el div con el iframe para dejar solo la tarjeta. */}
                                                
                                                {/* Botón de Comentarios (se mantiene) */}
                                                {isCommentable && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewComments(m.spotify_uri as string, contentType as 'track' | 'album' | 'playlist');
                                                        }}
                                                        style={{
                                                            marginTop: '4px',
                                                            marginLeft: m.user_id === user?.user_id ? 'auto' : '0',
                                                            display: 'block',
                                                            padding: '4px 8px',
                                                            background: '#374045',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Ver comentarios
                                                    </button>
                                                )}
                                            </div>
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
                            </React.Fragment>
                        );
                    })
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
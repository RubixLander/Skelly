import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import { useUser } from "../../../context/UserContext";
import styles from "../../../styles/ChatGrupo.module.css";

type Grupo = {
  group_id: string;
  owner_id: string;
  name: string;
  description?: string;
  image_url?: string;
};

type Member = {
  user_id: string;
  nickname?: string;
  custom_profile_image_url?: string | null;
};

const Settings = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [miembros, setMiembros] = useState<Member[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [imagen, setImagen] = useState<string | null>(null);

  const esOwner = user && grupo && user.user_id === grupo.owner_id;

  // 🔹 Cargar grupo y miembros
  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      try {
        const [grupoRes, miembrosRes] = await Promise.all([
          axios.get(`http://localhost:3001/api/groups/${id}`),
          axios.get(`http://localhost:3001/api/groups/${id}/members`),
        ]);

        const grupoData = grupoRes.data;
        const miembrosData = miembrosRes.data;

        setGrupo(grupoData);
        setDescripcion(grupoData.description || "");
        setImagen(grupoData.image_url || "/comunidad.jpg");
        setMiembros(miembrosData);
      } catch (err) {
        console.error("Error cargando datos del grupo:", err);
      }
    };

    fetchData();
  }, [id, user]);

  // 🔹 Guardar cambios
  const handleGuardar = async () => {
    if (!id || !user) return;
    try {
      const formData = new FormData();
      formData.append("description", descripcion);
      formData.append("user_id", user.user_id);

      if (imagen) {
        const res = await fetch(imagen);
        const blob = await res.blob();
        const file = new File([blob], "image.png", { type: blob.type });
        formData.append("image", file);
      }

      await axios.patch(`http://localhost:3001/api/groups/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Cambios guardados correctamente.");
    } catch (err) {
      console.error("Error guardando cambios:", err);
      alert("Error al guardar los cambios.");
    }
  };

  if (!grupo) return <div className="text-white p-8">Cargando grupo...</div>;

  // Buscar nombre del dueño
  const ownerName =
    miembros.find((m) => m.user_id === grupo.owner_id)?.nickname ||
    grupo.owner_id;

  return (
    <div className={styles["chat-container"]}>
      {/* HEADER */}
      <div className={styles["chat-header"]}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "30px",
            justifyContent: "space-between",
          }}
        >
          {/* Imagen + nombre */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <img
              src={imagen || "/comunidad.jpg"}
              alt="Imagen del grupo"
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "12px",
                objectFit: "cover",
              }}
            />
            <div>
              <h1>{esOwner ? "Ajustes del grupo" : "Ver detalles del grupo"}</h1>
              <h2 style={{ margin: "5px 0" }}>{grupo.name}</h2>
              <p style={{ color: "#ccc" }}>Dueño: {ownerName}</p>
            </div>
          </div>

          {/* Botón volver */}
          <button
            onClick={() => router.push(`/comunidad/${id}`)}
            style={{
              background: "#374045",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            ← Volver al chat
          </button>
        </div>
      </div>

      {/* INFO DEL GRUPO */}
      <div style={{ padding: "20px" }}>
        <label
          style={{
            color: "white",
            display: "block",
            marginBottom: "8px",
            marginTop: "20px",
          }}
        >
          Descripción:
        </label>

        {esOwner ? (
          <>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #555",
                backgroundColor: "#222",
                color: "white",
              }}
            />
            <button
              onClick={handleGuardar}
              style={{
                marginTop: "16px",
                background: "#027a64",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Guardar cambios
            </button>
          </>
        ) : (
          <p
            style={{
              backgroundColor: "#181818",
              padding: "10px",
              borderRadius: "8px",
              color: "#ccc",
            }}
          >
            {descripcion || "Sin descripción"}
          </p>
        )}
      </div>

      {/* LISTA DE MIEMBROS */}
      <div style={{ padding: "20px" }}>
        <h2 style={{ color: "white", marginBottom: "10px" }}>
          Miembros ({miembros.length})
        </h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {miembros.map((m) => (
            <li
              key={m.user_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#181818",
                padding: "10px",
                marginBottom: "8px",
                borderRadius: "8px",
                color: "white",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <img
                  src={
                    m.custom_profile_image_url &&
                    m.custom_profile_image_url.trim() !== ""
                      ? m.custom_profile_image_url
                      : "/profile.png"
                  }
                  alt={m.nickname || "Usuario"}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
                <span>{m.nickname || m.user_id}</span>
              </div>

              {/* Botón eliminar solo para dueño */}
              {esOwner && m.user_id !== user?.user_id && (
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar a ${m.nickname || m.user_id}?`))
                      axios.delete(
                        `http://localhost:3001/api/groups/${id}/members/${m.user_id}?user_id=${user?.user_id}`
                      );
                  }}
                  style={{
                    background: "#a63131",
                    border: "none",
                    color: "white",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Settings;

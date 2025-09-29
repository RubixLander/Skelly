// src/pages/profiles.tsx
import React, { useState, useRef, useEffect } from "react";
import FullHeader from "../components/Fullheader";
import { useUser } from "../context/UserContext";

const ProfilePage: React.FC = () => {
  const { user, setUser } = useUser();
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [customProfileImageUrl, setCustomProfileImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || "");
      setBio(user.bio || "");
      setCustomProfileImageUrl(user.custom_profile_image_url || "");
    }
  }, [user]);

  if (!user) {
    return (
      <FullHeader hideTabs={true}>
        <div style={{ textAlign: "center", padding: "20px" }}>
          <h2>Debes iniciar sesión para editar tu perfil</h2>
        </div>
      </FullHeader>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomProfileImageUrl(reader.result as string); // base64 preview
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("nickname", nickname);
      formData.append("bio", bio);

      if (selectedFile) {
        formData.append("image", selectedFile);
      } else if (customProfileImageUrl) {
        formData.append("custom_profile_image_url", customProfileImageUrl);
      }

      const response = await fetch(`http://localhost:3001/users/${user.user_id}`, {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al actualizar perfil");
      }

      const updatedUser = {
        ...user,
        nickname,
        bio,
        custom_profile_image_url: customProfileImageUrl,
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setMessage("Perfil actualizado con éxito ✅");
    } catch (error: any) {
      setMessage(error.message || "Error al actualizar el perfil ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FullHeader hideTabs={true}>
      <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
        {/* Imagen circular con recorte */}
        <div
          style={{
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            overflow: "hidden",
            margin: "20px auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <img
            src={customProfileImageUrl || "/profile.png"}
            alt="profile"
            style={{
              width: "100%",
              height: "auto",
              transform: "translateY(-20px)", // Mueve la imagen dentro del círculo
              objectFit: "cover",
            }}
          />
        </div>

        {/* Hidden input */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          ref={fileInputRef}
          style={{ display: "none" }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            marginBottom: "10px",
            padding: "8px 15px",
            backgroundColor: "#ccc",
            border: "none",
            borderRadius: "15px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Cambiar foto de perfil
        </button>

        <div>
          <input
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "10px",
            }}
          />
        </div>

        <div>
          <textarea
            placeholder="Biografía"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{
              width: "100%",
              minHeight: "120px",
              padding: "10px",
              marginTop: "10px",
            }}
          />
        </div>

        <button
          onClick={handleUpdate}
          disabled={loading}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#1DB954",
            color: "white",
            border: "none",
            borderRadius: "20px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {loading ? "Actualizando..." : "Guardar cambios"}
        </button>

        {message && (
          <p style={{ marginTop: "15px", color: message.includes("✅") ? "green" : "red" }}>
            {message}
          </p>
        )}
      </div>
    </FullHeader>
  );
};

export default ProfilePage;
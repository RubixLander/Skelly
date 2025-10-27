// src/pages/profiles.tsx
import React, { useState, useRef, useEffect } from "react";
import FullHeader from "../components/Fullheader";
import { useUser } from "../context/UserContext";

// Definición de Interfaz (Asegúrate de que coincida con tu UserContext)
interface User {
    user_id: string;
    nickname: string;
    bio?: string | null;
    custom_profile_image_url?: string | null;
    // ... otros campos del UserContext ...
    accessToken: any;
    display_email: string;
}

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
  
  const isImageUpdate = !!selectedFile;
  let updatedData: User = user as User;

  try {
   if (isImageUpdate) {
     
     // 🚨 1A: LLAMADA PARA SETEAR NULL EN DB y BORRAR ARCHIVO FÍSICO (SI EXISTE)
     if (user.custom_profile_image_url) {
       const nullPayload = {
         custom_profile_image_url: null, 
         nickname: user.nickname, 
         bio: user.bio,
       };

       const nullResponse = await fetch(`http://localhost:3001/users/${user.user_id}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(nullPayload),
       });

       if (!nullResponse.ok) {
         const err = await nullResponse.json().catch(() => ({ message: 'Error en el borrado de imagen anterior' }));
         throw new Error(err.message || "Error en el paso de borrado de imagen anterior.");
       }
              
              // 🔑 AGREGAMOS: Limpiamos la URL de previsualización temporal del estado.
              setCustomProfileImageUrl(""); 
     }
     
     // 🚨 1B: LLAMADA PARA SUBIR LA NUEVA IMAGEN Y GUARDAR LA URL
     const formData = new FormData();
     formData.append("nickname", nickname);
     formData.append("bio", bio);
     formData.append("image", selectedFile as File);

     const updateResponse = await fetch(`http://localhost:3001/users/${user.user_id}`, {
       method: "PATCH",
       body: formData, 
     });

     if (!updateResponse.ok) {
              // Si falla la subida, es posible que el borrado haya sido exitoso.
              // El back-end debería haber limpiado el archivo, pero la DB queda NULL.
       const err = await updateResponse.json().catch(() => ({ message: 'Error en el guardado de la nueva imagen' }));
       throw new Error(err.message || "Error en el paso de guardado de la nueva imagen.");
     }
     
     updatedData = await updateResponse.json();

   } else {
     // Solo Actualización de Texto
     const textPayload = {
       nickname: nickname,
       bio: bio,
     };
     
     const textResponse = await fetch(`http://localhost:3001/users/${user.user_id}`, {
       method: "PATCH",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(textPayload),
     });

     if (!textResponse.ok) {
       const err = await textResponse.json().catch(() => ({ message: 'Error al actualizar solo texto' }));
       throw new Error(err.message || "Error al actualizar solo texto.");
     }
     
     updatedData = await textResponse.json();
   }
   
   // Actualización final del estado
   setCustomProfileImageUrl(updatedData.custom_profile_image_url || "/profile.png"); 
   setUser(updatedData);
   setSelectedFile(null); 
   localStorage.setItem("user", JSON.stringify(updatedData));
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
       height: "100%", // 🚨 CAMBIO 1: La altura debe ser 100%
       transform: "none", // 🚨 CAMBIO 2: ELIMINAR la traslación vertical que causaba el recorte
       objectFit: "cover", // 🚨 CAMBIO 3: Asegura que la imagen llene el espacio sin distorsión
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

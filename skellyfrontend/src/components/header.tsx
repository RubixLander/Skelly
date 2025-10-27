// src/components/Header.tsx
import React, { useMemo, useEffect } from "react";
import "../styles/header.css";
import SearchBar from "./SearchBar";
import { usePlayer } from "../context/PlayerContext";
import { useRouter } from "next/router";
import { useSearchContext } from "../context/SearchContext";
import { useUser } from "../context/UserContext";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showTabs?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  showTabs = true,
}) => {
  // ✅ Orden actualizado
  const tabs = ["Comunidades", "Tu biblioteca", "Siguiendo", "Tu perfil"];
  
  const { handleSearch } = usePlayer();
  const router = useRouter();
  const { searchUsers, clearSearchResults } = useSearchContext();
  const { user } = useUser();

  const logoSrc = useMemo(
    () => (Math.random() < 0.01 ? "/shinylogo.gif" : "/logo.gif"),
    []
  );

useEffect(() => {
 // CORRECCIÓN: Si la ruta es la raíz '/', desactiva todas las pestañas.
if (router.pathname === "/") {
onTabChange(""); // Establece un valor inactivo para que activeTab no coincida con nada.
} else if (router.pathname === "/comunidades") {
 onTabChange("Comunidades");
 } else if (router.pathname === "/biblioteca") {
onTabChange("Tu biblioteca");
 } else if (router.pathname === "/seguidos") {
 onTabChange("Siguiendo");
 } else if (router.pathname === "/profiles") {
 onTabChange("Tu perfil");
 }
}, [router.pathname, onTabChange]);

  const goToComunidades = () => {
    onTabChange("Comunidades");
    clearSearchResults();
    router.push("/comunidades");
  };

  const goToBiblioteca = () => {
    onTabChange("Tu biblioteca");
    clearSearchResults();
    router.push("/biblioteca");
  };

  const goToSiguiendo = () => {
    onTabChange("Siguiendo");
    clearSearchResults();
    router.push("/seguidos");
  };

  const goToProfile = () => {
    onTabChange("Tu perfil");
    clearSearchResults();
    router.push("/profiles");
  };

  const onSearch = (query: string) => {
    if (!query.trim()) return;
    handleSearch(query); // Spotify
    searchUsers(query);  // Backend usuarios
    router.push("/");    // Redirigir a Home
  };

  const avatarPlaceholderStyle: React.CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#444",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    marginLeft: "10px",
    flexShrink: 0,
  };

  return (
    <header className="header-container">
      <div className="header-logo">
        <img
          src={logoSrc}
          alt="SkellyTunes"
          style={{ height: "40px", objectFit: "contain", display: "block" }}
        />
        <span className="header-title">SkellyTunes</span>
      </div>

      <SearchBar onSearch={onSearch} />

      {showTabs && (
        <nav className="header-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? "active" : "inactive"}`}
              onClick={() => {
                if (tab === "Comunidades") {
                  goToComunidades();
                } else if (tab === "Tu biblioteca") {
                  goToBiblioteca();
                } else if (tab === "Siguiendo") {
                  goToSiguiendo();
                } else if (tab === "Tu perfil") {
                  goToProfile();
                } else {
                  onTabChange(tab);
                }
              }}
              style={{
                backgroundColor: activeTab === tab ? "#1DB954" : "#333",
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
      )}

      <div
        className="header-user"
        onClick={goToProfile}
        style={{ cursor: "pointer" }}
        title="Ir a perfil"
      >
{user?.custom_profile_image_url ? (
      <img
       src={user.custom_profile_image_url}
       alt="Perfil"
       className="avatar-image"
       draggable={false}
              // Quitamos los estilos inline para confiar en el CSS
      />
    ) : (
      <img
       src="/profile.png"
       alt="Perfil"
       className="avatar-image"
       draggable={false}
              // Quitamos los estilos inline para confiar en el CSS
      />
    )}
   </div>
  </header>
 );
};

export default Header;
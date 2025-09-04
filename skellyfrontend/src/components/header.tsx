// src/components/Header.tsx
import React, { useMemo } from "react";
import "../styles/header.css";
import SearchBar from "./SearchBar";
import { usePlayer } from "../context/PlayerContext";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const tabs = ["Tu biblioteca", "Grupos", "Siguiendo", "Ajustes"];
  const { handleSearch } = usePlayer();

  const profileImage = null; // Simulación de imagen de perfil

  // ✅ 0.01% shiny — OJO: la ruta NO lleva /public
  const logoSrc = useMemo(
    () => (Math.random() < 0.01 ? "/shinylogo.gif" : "/logo.gif"),
    []
  );

  return (
    <header className="header-container">
      {/* Logo + Texto */}
      <div className="header-logo">
        <img
          src={logoSrc}
          alt="SkellyTunes"
          style={{ height: "40px", objectFit: "contain", display: "block" }}
        />
        <span className="header-title">SkellyTunes</span>
      </div>

      {/* Barra de búsqueda */}
      <SearchBar onSearch={handleSearch} />

      {/* Tabs */}
      <nav className="header-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? "active" : "inactive"}`}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Usuario */}
      <div className="header-user">
        {profileImage ? <img src={profileImage} alt="Perfil" /> : "👤"}
      </div>
    </header>
  );
};

export default Header;
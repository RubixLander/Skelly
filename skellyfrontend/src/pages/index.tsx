// src/pages/HomePage.tsx
import React, { useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { usePlayer } from "../context/PlayerContext";
import { SpotifyContext } from "../context/SpotifyContext";
import SpotifyAuthButton from "../components/SpotifyAuthButton";
import SearchResults from "../components/SearchResults";
import SpotifyPlayer from "../components/SpotifyPlayer";
import Header from "../components/header";
import { useSearchContext } from "../context/SearchContext";
import { SearchResult } from "../types/spotify-types"; // si lo tienes

const HomePage: React.FC = () => {
  const { searchResults: spotifyResults, isSearching: isSearchingSpotify, handlePlayUri, localError, clearError } =
    usePlayer();
  const { searchResults: userResultsContext, isSearching: isSearchingUsers } = useSearchContext();

  const { isAuthenticated, isLoading, error: contextError, deviceId } = useContext(SpotifyContext);
  const [activeTab, setActiveTab] = useState("Canciones");
  const [view, setView] = useState<"search" | "library">("search");
  const router = useRouter();

  // Detectar autenticación de Spotify y mandar al login SOLO si no se ha pasado aún
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const alreadyLogged = localStorage.getItem("appLoggedIn");
      if (!alreadyLogged) {
        router.push("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Estado inicial (cargando)
  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>SkellyTunes</h1>
        <p>Checking authentication and initializing player...</p>
      </div>
    );
  }

  // Error global de Spotify
  if (contextError) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        <h1>SkellyTunes</h1>
        <p>Error: {contextError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            margin: "10px",
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
          Try Again
        </button>
      </div>
    );
  }

  // Si no está autenticado → botón de login Spotify
  if (!isAuthenticated) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>SkellyTunes</h1>
        <p>
          You are not authenticated. In order to use SkellyTunes, you must link a Spotify account and log in.
        </p>
        <SpotifyAuthButton />
      </div>
    );
  }

  // ✅ Combinar resultados de Spotify + usuarios
  const combinedResults: SearchResult = {
    tracks: spotifyResults?.tracks ?? [],
    albums: spotifyResults?.albums ?? [],
    artists: spotifyResults?.artists ?? [],
    playlists: spotifyResults?.playlists ?? [],
    users: userResultsContext?.users ?? [],
  } as any;

  // ✅ Estado de búsqueda unificado
  const isAnySearching = Boolean(isSearchingSpotify || isSearchingUsers);

  // ✅ Si está autenticado Y pasó login → mostrar app
  return (
    <div style={{ fontFamily: "Arial, sans-serif", paddingBottom: "100px" }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main style={{ padding: "20px" }}>
        {localError && (
          <div style={{ color: "red", textAlign: "center", marginBottom: "20px" }}>
            Error: {localError}
            <button onClick={clearError} style={{ marginLeft: "10px" }}>
              Clear
            </button>
          </div>
        )}

        {/* Aquí es donde controlamos la vista */}
        {view === "search" ? (
          <SearchResults
            searchResults={combinedResults}
            isSearching={isAnySearching}
            onPlayUri={handlePlayUri}
            showTabs={true}
          />
        ) : (
          <div>
            <h2>Tu Biblioteca</h2>
            {/* Aquí podrías agregar la lógica de la biblioteca */}
          </div>
        )}
      </main>

      {deviceId && <SpotifyPlayer />}
    </div>
  );
};

export default HomePage;
// src/components/FullHeader.tsx
import React, { useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { usePlayer } from "../context/PlayerContext";  
import { SpotifyContext } from "../context/SpotifyContext";
import { useSearchContext } from "../context/SearchContext"; 
import SearchResults from "./SearchResults";  
import Header from "./header";  
import SpotifyPlayer from "./SpotifyPlayer";  
import { SearchResult } from "../types/spotify-types"; // si lo tienes

interface FullHeaderProps {
  children?: React.ReactNode;
  hideTabs?: boolean;
}

const FullHeader: React.FC<FullHeaderProps> = ({ children, hideTabs = false }) => {
  const { searchResults: spotifyResults, isSearching: isSearchingSpotify, handlePlayUri, localError, clearError } = usePlayer();
  const { searchResults: userResultsContext, isSearching: isSearchingUsers } = useSearchContext();
  const { isAuthenticated, isLoading, error: contextError, deviceId } = useContext(SpotifyContext);

  const [activeTab, setActiveTab] = useState("Canciones");
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const alreadyLogged = localStorage.getItem("appLoggedIn");
      if (!alreadyLogged) {
        router.push("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
      </div>
    );
  }

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

  if (!isAuthenticated) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>SkellyTunes</h1>
        <p>You are not authenticated. Please log in with Spotify.</p>
        <button
          onClick={() => router.push("/login")}
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
          Login to Spotify
        </button>
      </div>
    );
  }

  // ✅ Combinar resultados en forma estable
  const combinedResults: SearchResult = {
    tracks: spotifyResults?.tracks ?? [],
    albums: spotifyResults?.albums ?? [],
    artists: spotifyResults?.artists ?? [],
    playlists: spotifyResults?.playlists ?? [],
    users: userResultsContext?.users ?? [],
  } as any;

  // ✅ Estado de búsqueda unificado
  const isAnySearching = Boolean(isSearchingSpotify || isSearchingUsers);

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

{!["/comunidades", "/biblioteca", "/seguidos", "/profiles"].includes(router.pathname) && (
  <SearchResults
    searchResults={combinedResults}
    isSearching={isAnySearching}
    onPlayUri={handlePlayUri}
    showTabs={!hideTabs}
  />
)}


        {children}
      </main>

      {deviceId && <SpotifyPlayer />}
    </div>
  );
};

export default FullHeader;
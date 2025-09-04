// src/context/PlayerContext.tsx
import React, { createContext, useContext, useState } from "react";
import { SpotifyContext } from "./SpotifyContext";
import apiClient from "../lib/api";
import { SearchResult } from "../types/spotify-types";

interface PlayerContextProps {
  searchResults: SearchResult | null;
  isSearching: boolean;
  localError: string | null;
  handleSearch: (query: string) => Promise<void>;
  handlePlayUri: (uri: string) => Promise<void>;
  clearError: () => void;
}

const PlayerContext = createContext<PlayerContextProps | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const context = useContext(SpotifyContext);

  if (!context) {
    throw new Error("PlayerProvider must be used within a SpotifyProvider");
  }

  const { isAuthenticated, isLoading, playUri } = context;

  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // ✅ Eliminamos el useEffect que forzaba redirección
  // No redirigimos aquí. Que la página decida qué mostrar.

  // Función búsqueda
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setLocalError(null);

    try {
      const response = await apiClient.get(
        `/spotify/search?q=${encodeURIComponent(query)}&limit=50`
      );
      setSearchResults(response.data);
    } catch (err: any) {
      console.error("Search error:", err);
      setLocalError(err.response?.data?.message || err.message || "Search failed");
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Función reproducir
  const handlePlayUri = async (uri: string) => {
    try {
      await playUri(uri);
    } catch (err: any) {
      console.error("Play error:", err);
      setLocalError(err.message || "Failed to play item");
    }
  };

  const clearError = () => setLocalError(null);

  return (
    <PlayerContext.Provider
      value={{
        searchResults,
        isSearching,
        localError,
        handleSearch,
        handlePlayUri,
        clearError,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

// Hook de conveniencia
export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
};
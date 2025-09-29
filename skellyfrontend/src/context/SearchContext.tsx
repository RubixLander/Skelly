// src/context/SearchContext.tsx
import React, { createContext, useState, useContext, ReactNode } from "react";

export interface UserResult {
  user_id: string;
  nickname: string;
  display_email: string;
  custom_profile_image_url?: string | null;
  bio?: string | null;
}

interface SearchContextType {
  searchResults: { users: UserResult[] } | null;
  isSearching: boolean;
  searchUsers: (query: string) => Promise<void>;
  clearSearchResults: () => void;
}

interface SearchProviderProps {
  children: ReactNode;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchContext must be used within a SearchProvider");
  }
  return context;
};

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [searchResults, setSearchResults] = useState<{ users: UserResult[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const clearSearchResults = () => {
    setSearchResults(null);
  };

  const searchUsers = async (query: string) => {
    if (!query || !query.trim()) {
      setSearchResults({ users: [] });
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    if (!process.env.NEXT_PUBLIC_API_URL) {
      console.error("⚠️ Advertencia: NEXT_PUBLIC_API_URL no está definida en .env, usando fallback http://localhost:3001");
    }

    setIsSearching(true);

    try {
      const res = await fetch(`${apiUrl}/search/users?q=${encodeURIComponent(query)}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Error del backend (search/users):", errorData?.message || res.statusText);
        setSearchResults({ users: [] });
        return;
      }

      const rawData = await res.json(); // se espera un array de filas: { user_id, nickname, display_email, custom_profile_image_url, bio }

      // normalizamos (por si acaso)
      const normalized: UserResult[] = Array.isArray(rawData)
        ? rawData.map((u: any) => ({
            user_id: String(u.user_id),
            nickname: u.nickname ?? u.display_name ?? "",
            display_email: u.display_email ?? "",
            custom_profile_image_url: u.custom_profile_image_url ?? null,
            bio: u.bio ?? null,
          }))
        : [];

      // siempre devolvemos la forma { users: [...] }
      setSearchResults({ users: normalized });
    } catch (err) {
      console.error("Error en búsqueda de usuarios:", err);
      setSearchResults({ users: [] });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SearchContext.Provider value={{ searchResults, isSearching, searchUsers, clearSearchResults }}>
      {children}
    </SearchContext.Provider>
  );
};

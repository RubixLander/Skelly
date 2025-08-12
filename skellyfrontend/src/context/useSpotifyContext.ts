// src/context/useSpotifyContext.ts
import { useContext } from 'react';
// --- CORRECCIÓN: Importar SpotifyContextType como exportación con nombre ---
import { SpotifyContext, SpotifyContextType } from './SpotifyContext'; 

// --- CORRECCIÓN: Exportar el tipo para que otros archivos puedan usarlo si es necesario ---
export type { SpotifyContextType, PlayerState } from './SpotifyContext';

export const useSpotifyContext = (): SpotifyContextType => {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error('useSpotifyContext must be used within a SpotifyProvider');
  }
  return context;
};
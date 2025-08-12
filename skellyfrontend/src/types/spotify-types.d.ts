// spotify-types.ts
declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }

  interface SpotifyPlayer {
    connect: () => Promise<boolean>;
    disconnect: () => void;
    addListener: (event: string, callback: (data: any) => void) => void;
    removeListener: (event: string, callback?: (data: any) => void) => void;
    on: (event: string, callback: (data: any) => void) => void;
    getCurrentState: () => Promise<Spotify.PlaybackState | null>;
    setName: (name: string) => Promise<void>;
    setVolume: (volume: number) => Promise<void>;
    activateElement: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    togglePlay: () => Promise<void>;
    seek: (position_ms: number) => Promise<void>;
    previousTrack: () => Promise<void>;
    nextTrack: () => Promise<void>;
  }

  namespace Spotify {
    // ... (mantén todo lo que ya tienes)
  }
}

// Exporta los tipos que necesitas usar
export interface SpotifyTrack {
  id: string | null;
  uri: string;
  type: 'track';
  name: string;
  duration_ms: number;
  artists: Spotify.Artist[];
  album: Spotify.Album;
  is_playable: boolean;
  popularity: number;
  preview_url: string | null;
  track_number: number;
  external_urls: Record<string, string>;
}

export interface SpotifyAlbum {
  id: string | null;
  uri: string;
  type: 'album';
  name: string;
  artists: Spotify.Artist[];
  images: Spotify.Image[];
  release_date: string;
  total_tracks: number;
  external_urls: Record<string, string>;
}

export interface SpotifyArtist {
  id: string | null;
  uri: string;
  type: 'artist';
  name: string;
  images: Spotify.Image[];
  genres: string[];
  followers: { total: number };
  external_urls: Record<string, string>;
}

export interface SpotifyPlaylist {
  id: string | null;
  uri: string;
  type: 'playlist';
  name: string;
  description: string | null;
  images: Spotify.Image[];
  owner: {
    display_name: string;
    id: string;
  };
  tracks: {
    total: number;
  };
  external_urls: Record<string, string>;
}

// Tipo unificado para búsqueda
export type SpotifyItem = SpotifyTrack | SpotifyAlbum | SpotifyArtist | SpotifyPlaylist;

// Tipo para los resultados de búsqueda
export interface SearchResult {
  tracks: SpotifyTrack[];
  albums: SpotifyAlbum[];
  artists: SpotifyArtist[];
  playlists: SpotifyPlaylist[];
}

export {};
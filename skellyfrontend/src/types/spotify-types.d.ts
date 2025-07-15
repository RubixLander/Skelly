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
  }
}

export {};
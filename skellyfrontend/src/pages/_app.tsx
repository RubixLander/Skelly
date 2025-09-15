import type { AppProps } from "next/app";
import { SpotifyProvider } from "../context/SpotifyContext";
import { PlayerProvider } from "../context/PlayerContext";
import { UserProvider } from '../context/UserContext'; // Importa el contexto

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SpotifyProvider>
      <PlayerProvider>
        <UserProvider>
          <Component {...pageProps} />
        </UserProvider>
      </PlayerProvider>
    </SpotifyProvider>
  );
}

export default MyApp;
import type { AppProps } from "next/app";
import { SpotifyProvider } from "../context/SpotifyContext";
import { PlayerProvider } from "../context/PlayerContext";
import { UserProvider } from '../context/UserContext'; // Importa el contexto
import { SearchProvider } from '../context/SearchContext'; // Asegúrate de que está importado

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SpotifyProvider>
      <PlayerProvider>
        <UserProvider>
          <SearchProvider>  {/* Envuelve con SearchProvider */}
            <Component {...pageProps} />
          </SearchProvider>
        </UserProvider>
      </PlayerProvider>
    </SpotifyProvider>
  );
}

export default MyApp;
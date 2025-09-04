import type { AppProps } from "next/app";
import { SpotifyProvider } from "../context/SpotifyContext";
import { PlayerProvider } from "../context/PlayerContext";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SpotifyProvider>
      <PlayerProvider>
        <Component {...pageProps} />
      </PlayerProvider>
    </SpotifyProvider>
  );
}

export default MyApp;
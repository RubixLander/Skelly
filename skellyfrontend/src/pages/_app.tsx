// src/pages/_app.tsx
import React from 'react';
import { SpotifyProvider } from '../context/SpotifyContext';

function MyApp({ Component, pageProps }: { Component: any; pageProps: any }) {
  return (
    <SpotifyProvider>
      <Component {...pageProps} />
    </SpotifyProvider>
  );
}

export default MyApp;
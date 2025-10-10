export const fetchSpotifyData = async (
  spotify_uri: string,
  content_type: string,
  token: string
) => {
  const id = spotify_uri.split(":")[2]; // "spotify:track:xxx"
  let url = "";

  if (content_type === "track") url = `http://localhost:3001/spotify/track/${id}`;
  if (content_type === "album") url = `http://localhost:3001/spotify/album/${id}`;
  if (content_type === "playlist") url = `http://localhost:3001/spotify/playlist/${id}`;
  if (content_type === "artist") url = `http://localhost:3001/spotify/artist/${id}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Error al traer datos de Spotify");
  return res.json();
};
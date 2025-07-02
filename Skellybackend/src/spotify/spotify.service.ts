import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';

@Injectable()
export class SpotifyService {
  // Almacenamiento temporal del token de acceso y token de refresco
  private accessToken: string = '';
  private refreshToken: string = '';

  constructor(private readonly httpService: HttpService) {}

  // Método que genera la URL para redirigir al usuario a la página de login de Spotify
  getAuthUrl(): { url: string } {
    const clientId = process.env.SPOTIFY_CLIENT_ID ?? '';
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? '';

    // Lista de permisos necesarios para controlar la reproducción
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-modify-playback-state',
      'user-read-playback-state',
      'streaming'
    ].join(' ');

    // Construcción de la URL de autorización con los parámetros necesarios
    const url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(
      scopes,
    )}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return { url }; // Retorna la URL lista para redirigir al navegador
  }

  // Método que intercambia el "code" recibido desde Spotify por un access token
  async getAccessToken(code: string) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    // Validación de variables de entorno requeridas
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Faltan variables de entorno para la autenticación de Spotify');
    }

    // Configuración de los parámetros del request para obtener el token
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    // Codificación del clientId y clientSecret para el encabezado Authorization
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    // Envío de la solicitud POST al endpoint de token de Spotify
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    // Validación de errores en la respuesta
    if (!response.ok) {
      throw new Error(`Error al obtener token: ${data.error_description || data.error}`);
    }

    // Almacena temporalmente los tokens obtenidos
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;

    return data; // Devuelve el objeto con el access y refresh token
  }

  // Helper para retornar el encabezado de autorización con el token actual
  private getAuthHeader(): { Authorization: string } {
    if (!this.accessToken) {
      throw new Error('No se ha obtenido un token de acceso aún.');
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  // Método que solicita a Spotify iniciar la reproducción de una canción específica
  async playTrack(uri: string): Promise<void> {
    await firstValueFrom(
      this.httpService.put(
        'https://api.spotify.com/v1/me/player/play',
        { uris: [uri] }, // El cuerpo incluye la URI del track a reproducir
        { headers: this.getAuthHeader() }, // Se adjunta el token de acceso
      ),
    );
  }

  // Método que pausa la reproducción actual
  async pauseTrack(): Promise<void> {
    await firstValueFrom(
      this.httpService.put(
        'https://api.spotify.com/v1/me/player/pause',
        {}, // Sin cuerpo
        { headers: this.getAuthHeader() },
      ),
    );
  }

  // Método que obtiene información sobre la canción que se está reproduciendo
  async getCurrentTrack(): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: this.getAuthHeader(),
      }),
    );
    return data;
  }

  //Buscar
  async searchAll(query: string, limit: number = 5) {
    if (!query || query.trim().length === 0) {
      throw new Error('El parámetro "query" no puede estar vacío.');
    }

    const url = `https://api.spotify.com/v1/search`;
    const params = new URLSearchParams({
      q: encodeURIComponent(query),
      type: 'track,album,artist', // Buscar múltiples tipos de recursos
      limit: limit.toString(),
    });

    try {
      console.log('Realizando búsqueda con los siguientes parámetros:');
      console.log('Query:', query);
      console.log('Limit:', limit);
      console.log('URL:', `${url}?${params.toString()}`);
      console.log('Headers:', this.getAuthHeader());

      const response = await firstValueFrom(
        this.httpService.get(`${url}?${params.toString()}`, {
          headers: this.getAuthHeader(),
        }),
      );

      // Extraer los resultados de cada tipo
      const tracks = response.data.tracks?.items || [];
      const albums = response.data.albums?.items || [];
      const artists = response.data.artists?.items || [];

      // Devolver los resultados combinados
      return {
        tracks,
        albums,
        artists,
      };
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error detallado:', error.message);
          throw new Error(`Error al realizar la búsqueda: ${error.message}`);
        } else {
          console.error('Error desconocido:', error);
          throw new Error('Ocurrió un error desconocido.');
        }
      }
  }
}
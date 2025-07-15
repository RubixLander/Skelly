import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';

@Injectable()
export class SpotifyService {
  private accessToken: string = '';
  private refreshToken: string = '';

  constructor(private readonly httpService: HttpService) {}

  getAuthUrl(): { url: string } {
    const clientId = process.env.SPOTIFY_CLIENT_ID ?? '';
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? '';

    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-modify-playback-state',
      'user-read-playback-state',
      'streaming'
    ].join(' ');

    const url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return { url };
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  setRefreshToken(token: string) {
    this.refreshToken = token;
  }

  async getAccessToken(code: string) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Faltan variables de entorno para la autenticación de Spotify');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://accounts.spotify.com/api/token',
          params.toString(),
          {
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
      );

      const data = response.data;
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;

      return data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener token de acceso: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener token de acceso');
    }
  }

  private getAuthHeader(): { Authorization: string } {
    if (!this.accessToken) {
      throw new Error('No se ha obtenido un token de acceso aún.');
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  async playTrack(uri: string, deviceId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          { uris: [uri] },
          { headers: this.getAuthHeader() }
        )
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error en Spotify API:', error.message);
        throw new Error(`Error al reproducir pista: ${error.message}`);
      }
      throw new Error('Error desconocido al reproducir pista');
    }
  }

  async pauseTrack(): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.put(
          'https://api.spotify.com/v1/me/player/pause',
          {},
          { headers: this.getAuthHeader() },
        ),
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al pausar: ${error.message}`);
      }
      throw new Error('Error desconocido al pausar');
    }
  }

  async getCurrentTrack(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: this.getAuthHeader(),
        }),
      );
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener pista actual: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener pista actual');
    }
  }

  async searchAll(query: string, limit: number = 5) {
    if (!query || query.trim().length === 0) {
      throw new Error('El parámetro "query" no puede estar vacío.');
    }

    const url = `https://api.spotify.com/v1/search`;
    const params = new URLSearchParams({
      q: encodeURIComponent(query),
      type: 'track,album,artist',
      limit: limit.toString(),
    });

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${url}?${params.toString()}`, {
          headers: this.getAuthHeader(),
        }),
      );

      return {
        tracks: response.data.tracks?.items || [],
        albums: response.data.albums?.items || [],
        artists: response.data.artists?.items || [],
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error en búsqueda: ${error.message}`);
      }
      throw new Error('Error desconocido en búsqueda');
    }
  }
}
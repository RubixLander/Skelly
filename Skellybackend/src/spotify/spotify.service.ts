import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';
import { PlayDto } from './dto/play.dto';
import axios from 'axios';

@Injectable()
export class SpotifyService {
  baseUrl: any;
  private accessToken: string = '';
  private refreshToken: string = '';
  spotifyService: any;

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

async playTrack(playDto: PlayDto, deviceId: string): Promise<void> {
  try {
    // Si no hay uris ni context_uri, es una solicitud de reanudar
    if (!playDto.uris && !playDto.context_uri) {
      // Para reanudar, llamamos sin cuerpo
      // La API de Spotify reanuda la reproducción pausada en el dispositivo especificado
      await firstValueFrom(
        this.httpService.put(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {}, // Cuerpo vacío para reanudar
          { headers: this.getAuthHeader() }
        )
      );
      console.log(`Playback resumed on device ${deviceId}`);
      return; // Salir temprano
    }

    // Si hay uris o context_uri, proceder con la lógica original
    const body: any = {
      ...(playDto.uris && { uris: playDto.uris }),
      ...(playDto.context_uri && { context_uri: playDto.context_uri }),
      ...(playDto.offset && { offset: playDto.offset }),
      ...(playDto.position_ms !== undefined && { position_ms: playDto.position_ms }),
    };

    await firstValueFrom(
      this.httpService.put(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        body, // Cuerpo con datos para nueva reproducción
        { headers: this.getAuthHeader() }
      )
    );
    console.log(`Playback started on device ${deviceId}`, body);
  } catch (error: unknown) {
    // ... manejo de errores existente ...
    if (error instanceof Error) {
      console.error('Error en Spotify API (playTrack):', error.message);
      if ('response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
        const spotifyError = (error.response as any).data;
        if (spotifyError && spotifyError.error && spotifyError.error.message) {
          throw new Error(`Spotify API error: ${spotifyError.error.message}`);
        }
      }
      throw new Error(`Error al reproducir/reanudar: ${error.message}`);
    }
    throw new Error('Error desconocido al reproducir/reanudar pista');
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

async searchAll(query: string, limit: number = 900) {
  if (!query || query.trim().length === 0) {
    throw new Error('El parámetro "query" no puede estar vacío.');
  }
  const url = `https://api.spotify.com/v1/search`;
  const params = new URLSearchParams({
    q: encodeURIComponent(query),
    type: 'track,album,artist,playlist',
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
      playlists: response.data.playlists?.items || [],
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error en Spotify API (searchAll):', error.message);
      if ('response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
          const spotifyError = (error.response as any).data;
          if (spotifyError && spotifyError.error && spotifyError.error.message) {
             // Propagar errores específicos de la API de Spotify
             throw new Error(`Spotify API error: ${spotifyError.error.message}`);
          }
      }
      throw new Error(`Error desconocido en búsqueda: ${error.message}`);
    }
    throw new Error('Error desconocido en búsqueda');
  }
}

  async nextTrack(deviceId: string): Promise<void> {
  try {
    await firstValueFrom(
      this.httpService.post(
        `https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`,
        {},
        { headers: this.getAuthHeader() }
      )
    );
  } catch (error) {
    console.error('Error al reproducir siguiente pista:', error);
    throw new Error('Failed to play next track');
  }
}

async previousTrack(deviceId: string): Promise<void> {
  try {
    await firstValueFrom(
      this.httpService.post(
        ` https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`,
        {},
        { headers: this.getAuthHeader() }
      )
    );
  } catch (error) {
    console.error('Error al reproducir pista anterior:', error);
    throw new Error('Failed to play previous track');
  }
}

async seekTrack(positionMs: number, deviceId: string): Promise<void> {
  try {
    await firstValueFrom(
      this.httpService.put(
        `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${deviceId}`,
        {}, // No hay cuerpo en esta solicitud
        { headers: this.getAuthHeader() }
      )
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Error al buscar posición: ${error.message}`);
    }
    throw new Error('Error desconocido al buscar posición');
  }
}

async getArtistTopTracks(artistId: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.get(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
        { headers: this.getAuthHeader() }
      )
    );
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener top tracks del artista: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener top tracks del artista');
  }
}

async getAlbumTracks(albumId: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.get(
        `https://api.spotify.com/v1/albums/${albumId}/tracks`,
        { headers: this.getAuthHeader() }
      )
    );
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener tracks del álbum: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener tracks del álbum');
  }
}

async getPlaylistTracks(playlistId: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { headers: this.getAuthHeader() }
      )
    );
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener tracks de la playlist: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener tracks de la playlist');
  }
}

async getArtistAlbums(artistId: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.get(
        `https://api.spotify.com/v1/artists/${artistId}/albums`,
        { headers: this.getAuthHeader() }
      )
    );
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener álbumes del artista: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener álbumes del artista');
  }
}

  private async getHeaders() {
    // 👇 aquí usas tu lógica de obtener/renovar el token de Spotify
    const token = process.env.SPOTIFY_ACCESS_TOKEN;
    if (!token) throw new HttpException("Spotify token not set", 500);

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async getArtistDetails(artistId: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.get(
        `https://api.spotify.com/v1/artists/${artistId}`,
        { headers: this.getAuthHeader() }
      )
    );
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener detalles del artista: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener detalles del artista');
  }
}

async getAlbumDetails(albumId: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.get(
        `https://api.spotify.com/v1/albums/${albumId}`,
        { headers: this.getAuthHeader() }
      )
    );
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener detalles del álbum: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener detalles del álbum');
  }
}

async getPlaylistDetails(playlistId: string): Promise<any> {
  try {
    const response = await firstValueFrom(
      this.httpService.get(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        { headers: this.getAuthHeader() }
      )
    );
    return response.data;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Error al obtener detalles de la playlist: ${error.message}`);
    }
    throw new Error('Error desconocido al obtener detalles de la playlist');
  }
}

}
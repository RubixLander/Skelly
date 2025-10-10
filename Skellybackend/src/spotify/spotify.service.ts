import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';
import { PlayDto } from './dto/play.dto';

@Injectable()
export class SpotifyService {
  baseUrl: any;
  private accessToken: string = '';
  private refreshToken: string = '';
  private tokenExpiresAt: number = 0; // timestamp ms cuando expira el access token de usuario
  private appAccessToken: string = ''; // client credentials token
  private appTokenExpiresAt: number = 0;

  spotifyService: any;

  constructor(private readonly httpService: HttpService) {}

  /* ---------------- Auth helpers ---------------- */

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

  /**
   * Establece el token de usuario (y opcionalmente refreshToken/expiry).
   * Se puede llamar desde el controller por cada request (si envían el token en header)
   * o desde callback para guardar tokens cuando se obtiene el authorization_code.
   */
  setAccessToken(token: string, refreshToken?: string, expiresIn?: number) {
    this.accessToken = token;
    if (refreshToken) this.refreshToken = refreshToken;
    if (expiresIn) {
      // guardamos con margen de 60s para prevenir llamadas al límite
      this.tokenExpiresAt = Date.now() + expiresIn * 1000 - 60 * 1000;
    } else {
      // si no sabemos expiresIn, dejamos tokenExpiresAt = 0 (no expirado conocido)
      this.tokenExpiresAt = 0;
    }
  }

  setRefreshToken(token: string) {
    this.refreshToken = token;
  }

  /**
   * Obtiene access token vía Authorization Code (usado en callback)
   * además guarda refresh token y expiry en el servicio.
   */
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
      // guarda tokens en la instancia
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      if (data.expires_in) {
        this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60 * 1000;
      }

      return data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener token de acceso: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener token de acceso');
    }
  }

  /**
   * Refresca el access token usando refresh token (Authorization Code refresh).
   * Actualiza this.accessToken, this.refreshToken (si viene) y tokenExpiresAt.
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No hay refresh token disponible');
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Missing Spotify client credentials');

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', this.refreshToken);

    try {
      console.log('Token expirado, refrescando...');
      const response = await firstValueFrom(
        this.httpService.post('https://accounts.spotify.com/api/token', params.toString(), {
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );

      const data = response.data;
      if (!data.access_token) throw new Error('No se obtuvo access_token al refrescar');

      this.accessToken = data.access_token;
      // Spotify a veces devuelve refresh_token en refresh_response, si viene actualizamos
      if (data.refresh_token) this.refreshToken = data.refresh_token;
      if (data.expires_in) this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60 * 1000;

      return data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error refresh token: ${error.message}`);
      }
      throw new Error('Error desconocido al refrescar token');
    }
  }

  /**
   * Client Credentials Flow: token a nivel app (para endpoints públicos).
   * Guarda appAccessToken y expiry.
   */
  private async getAppAccessToken() {
    // si aún es válido lo devolvemos
    if (this.appAccessToken && Date.now() < this.appTokenExpiresAt - 60 * 1000) {
      return this.appAccessToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Missing Spotify client credentials (app)');

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://accounts.spotify.com/api/token', params.toString(), {
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );

      const data = response.data;
      if (!data.access_token) throw new Error('No se obtuvo app access token');

      this.appAccessToken = data.access_token;
      this.appTokenExpiresAt = Date.now() + data.expires_in * 1000 - 60 * 1000;
      return this.appAccessToken;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener app token: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener app token');
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

  /* ---------------- Generic request helpers ---------------- */

  /**
   * Llama a un endpoint usando token de usuario; si expiró intenta refresh si existe refresh token.
   * Si no hay refresh token lanza el error original.
   */
  private async callWithUserToken(method: string, url: string, data?: any) {
    if (!this.accessToken) throw new Error('No se ha obtenido un token de acceso aún.');

    // Si sabemos expiry y está expirado, intentamos refrescar
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt) {
      if (!this.refreshToken) {
        throw new Error('No hay refresh token disponible');
      }
      await this.refreshAccessToken();
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: method as any,
          url,
          data,
          headers: this.getAuthHeader(),
        }),
      );
      return response.data;
    } catch (err: any) {
      // si 401 y tenemos refresh token, intentar refrescar y repetir una vez
      if (err?.response?.status === 401 && this.refreshToken) {
        try {
          await this.refreshAccessToken();
          const retry = await firstValueFrom(
            this.httpService.request({
              method: method as any,
              url,
              data,
              headers: this.getAuthHeader(),
            }),
          );
          return retry.data;
        } catch (err2: any) {
          // Propagar error final con detalle de Spotify si viene
          if (err2?.response?.data) {
            throw new Error(`Spotify API error: ${err2.response.data.error?.message ?? JSON.stringify(err2.response.data)}`);
          }
          throw err2;
        }
      }

      // si no es 401 o no hay refresh token, devolver error legible
      if (err?.response?.data) {
        throw new Error(`Spotify API error: ${err.response.data.error?.message ?? JSON.stringify(err.response.data)}`);
      }
      throw err;
    }
  }

  /**
   * Intenta usar token de usuario, si falla o no hay token válido y allowAppFallback=true,
   * obtiene token app (client credentials) y lo usa para la llamada. Esto es ideal para endpoints públicos.
   */
  private async callWithUserOrAppToken(method: string, url: string, data?: any, allowAppFallback = true) {
    // Si tenemos accessToken intentamos con él
    if (this.accessToken) {
      try {
        return await this.callWithUserToken(method, url, data);
      } catch (err) {
        // si falló con invalidez de token pero no hay refresh token -> fallback a app (si permitido)
        const message = (err instanceof Error) ? err.message : String(err);
        const isInvalid = /invalid access token|invalid_token|401|No hay refresh token disponible/i.test(message);
        if (!isInvalid || !allowAppFallback) {
          throw err;
        }
        // continuamos al fallback a app token
      }
    }

    if (allowAppFallback) {
      // usar token de app (client credentials)
      const appToken = await this.getAppAccessToken();
      try {
        const response = await firstValueFrom(
          this.httpService.request({
            method: method as any,
            url,
            data,
            headers: { Authorization: `Bearer ${appToken}` }
          })
        );
        return response.data;
      } catch (err: any) {
        if (err?.response?.data) {
          throw new Error(`Spotify API error: ${err.response.data.error?.message ?? JSON.stringify(err.response.data)}`);
        }
        throw err;
      }
    }

    throw new Error('No hay token disponible para llamar a Spotify (usuario ni app)');
  }

  /* ---------------- Public API methods (no se eliminó ninguna función) ---------------- */

  async playTrack(playDto: PlayDto, deviceId: string): Promise<void> {
    try {
      // Validate deviceId (controller ya lo valida, pero redundancia)
      if (!deviceId) throw new Error('device_id is required');

      // Si no hay uris ni context_uri -> reanudar (PUT sin body)
      if (!playDto.uris && !playDto.context_uri) {
        await this.callWithUserToken('put', `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {});
        console.log(`Playback resumed on device ${deviceId}`);
        return;
      }

      const body: any = {
        ...(playDto.uris && { uris: playDto.uris }),
        ...(playDto.context_uri && { context_uri: playDto.context_uri }),
        ...(playDto.offset && { offset: playDto.offset }),
        ...(playDto.position_ms !== undefined && { position_ms: playDto.position_ms }),
      };

      await this.callWithUserToken('put', `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, body);
      console.log(`Playback started on device ${deviceId}`, body);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error en Spotify API (playTrack):', error.message);
        throw new Error(`Error al reproducir/reanudar: ${error.message}`);
      }
      throw new Error('Error desconocido al reproducir/reanudar pista');
    }
  }

  async pauseTrack(): Promise<void> {
    try {
      await this.callWithUserToken('put', 'https://api.spotify.com/v1/me/player/pause', {});
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al pausar: ${error.message}`);
      }
      throw new Error('Error desconocido al pausar');
    }
  }

  async getCurrentTrack(): Promise<any> {
    try {
      return await this.callWithUserToken('get', 'https://api.spotify.com/v1/me/player/currently-playing');
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
      q: query, // ya encodea en URLSearchParams
      type: 'track,album,artist,playlist',
      limit: limit.toString(),
    });
    try {
      const response = await this.callWithUserOrAppToken('get', `${url}?${params.toString()}`, undefined, true);
      return {
        tracks: response.tracks?.items || [],
        albums: response.albums?.items || [],
        artists: response.artists?.items || [],
        playlists: response.playlists?.items || [],
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error en Spotify API (searchAll):', error.message);
        throw new Error(`Error en búsqueda: ${error.message}`);
      }
      throw new Error('Error desconocido en búsqueda');
    }
  }

  async nextTrack(deviceId: string): Promise<void> {
    try {
      await this.callWithUserToken('post', `https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, {});
    } catch (error) {
      console.error('Error al reproducir siguiente pista:', error);
      throw new Error('Failed to play next track');
    }
  }

  async previousTrack(deviceId: string): Promise<void> {
    try {
      await this.callWithUserToken('post', `https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, {});
    } catch (error) {
      console.error('Error al reproducir pista anterior:', error);
      throw new Error('Failed to play previous track');
    }
  }

  async seekTrack(positionMs: number, deviceId: string): Promise<void> {
    try {
      await this.callWithUserToken('put', `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${deviceId}`, {});
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al buscar posición: ${error.message}`);
      }
      throw new Error('Error desconocido al buscar posición');
    }
  }

  async getArtistTopTracks(artistId: string): Promise<any> {
    try {
      return await this.callWithUserOrAppToken('get', `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, undefined, true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener top tracks del artista: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener top tracks del artista');
    }
  }

  async getAlbumTracks(albumId: string): Promise<any> {
    try {
      return await this.callWithUserOrAppToken('get', `https://api.spotify.com/v1/albums/${albumId}/tracks`, undefined, true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener tracks del álbum: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener tracks del álbum');
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<any> {
    try {
      return await this.callWithUserOrAppToken('get', `https://api.spotify.com/v1/playlists/${playlistId}/tracks`, undefined, true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener tracks de la playlist: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener tracks de la playlist');
    }
  }

  async getArtistAlbums(artistId: string): Promise<any> {
    try {
      return await this.callWithUserOrAppToken('get', `https://api.spotify.com/v1/artists/${artistId}/albums`, undefined, true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener álbumes del artista: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener álbumes del artista');
    }
  }

  // Este getHeaders lo mantengo por compatibilidad, pero internamente no usamos env token.
  private async getHeaders() {
    const token = process.env.SPOTIFY_ACCESS_TOKEN;
    if (!token) throw new HttpException("Spotify token not set", 500);

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async getArtistDetails(artistId: string): Promise<any> {
    try {
      return await this.callWithUserOrAppToken('get', `https://api.spotify.com/v1/artists/${artistId}`, undefined, true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener detalles del artista: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener detalles del artista');
    }
  }

  async getAlbumDetails(albumId: string): Promise<any> {
    try {
      return await this.callWithUserOrAppToken('get', `https://api.spotify.com/v1/albums/${albumId}`, undefined, true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener detalles del álbum: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener detalles del álbum');
    }
  }

  async getPlaylistDetails(playlistId: string): Promise<any> {
    try {
      return await this.callWithUserOrAppToken('get', `https://api.spotify.com/v1/playlists/${playlistId}`, undefined, true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al obtener detalles de la playlist: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener detalles de la playlist');
    }
  }

  /**
   * Mantengo la firma (trackId, token) para compatibilidad con controller.
   * El parámetro token se ignora: usamos this.accessToken / refreshToken / app token interno.
   */
  async getTrackById(trackId: string, token?: string): Promise<any> {
    try {
      return await this.callWithUserOrAppToken('get', `https://api.spotify.com/v1/tracks/${trackId}`, undefined, true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error en getTrackById:', error.message);
        if ((error as any)?.message?.includes('Spotify API error')) {
          throw new Error((error as any).message);
        }
        throw new Error(`Error al obtener detalles del track: ${error.message}`);
      }
      throw new Error('Error desconocido al obtener detalles del track');
    }
  }

  /* ---------------- Utility method para el controller ---------------- */

  /**
   * Verifica si el token actual (o el que se pasa) es válido para /v1/me.
   * Si viene refreshToken intenta refresh cuando corresponde.
   * Devuelve objeto con estado y nuevos tokens si hubo refresh.
   */
  async isAuthenticated(accessToken?: string, refreshToken?: string) {
    try {
      if (accessToken) {
        // Si frontend nos manda tokens en cada request, guardamos
        this.setAccessToken(accessToken);
      }
      if (refreshToken) {
        this.setRefreshToken(refreshToken);
      }

      // Intentar llamada /me
      try {
        await firstValueFrom(this.httpService.get('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }));
        return {
          authenticated: true,
          accessToken: this.accessToken,
          refreshToken: this.refreshToken || null
        };
      } catch (err: any) {
        // si 401 y tenemos refresh token, intentar refresh
        if (err?.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            await firstValueFrom(this.httpService.get('https://api.spotify.com/v1/me', {
              headers: { Authorization: `Bearer ${this.accessToken}` }
            }));
            return {
              authenticated: true,
              accessToken: this.accessToken,
              refreshToken: this.refreshToken || null
            };
          } catch (err2) {
            // refresh falló -> no autenticado
            return { authenticated: false, accessToken: null, refreshToken: null };
          }
        }

        // No autenticado
        return { authenticated: false, accessToken: null, refreshToken: null };
      }
    } catch (error: unknown) {
      console.error('isAuthenticated error:', error);
      return { authenticated: false, accessToken: null, refreshToken: null };
    }
  }
}

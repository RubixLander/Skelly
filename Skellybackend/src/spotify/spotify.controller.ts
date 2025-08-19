import { Controller, Get, Post, Body, Query, Req, Res, Headers, Put, Param } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { PlayDto } from './dto/play.dto';
import { Request, Response } from 'express';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SeekDto } from './dto/seek.dto';

@Controller('spotify')
export class SpotifyController {
  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly httpService: HttpService
  ) {}

  @Post('login')
  login() {
    try {
      return this.spotifyService.getAuthUrl();
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate Spotify auth URL');
    }
  }

@Get('callback')
async callback(@Query('code') code: string, @Res() res: Response) {
  if (!code) {
    throw new BadRequestException('Authorization code is required');
  }

  try {
    const tokenData = await this.spotifyService.getAccessToken(code);
    
    // Guarda tokens en localStorage via frontend (no cookies)
    const redirectUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('access_token', tokenData.access_token);
    redirectUrl.searchParams.set('refresh_token', tokenData.refresh_token || '');

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
}

  @Get('check-auth')
  async checkAuth(@Req() req: Request) {
    try {
      const accessToken = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '');
      const refreshToken = req.cookies.refresh_token;

      // Verificar token de acceso si existe
      if (accessToken) {
        try {
          await firstValueFrom(
            this.httpService.get('https://api.spotify.com/v1/me', {
              headers: { Authorization: `Bearer ${accessToken}` }
            })
          );
          
          return {
            authenticated: true,
            accessToken: accessToken,
            refreshToken: refreshToken || null
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.log('Access token validation failed:', error.message);
          }
          // No lanzamos error aquí, continuamos con refresh token
        }
      }

      // Intentar refrescar el token si existe refreshToken
      if (refreshToken) {
        try {
          // CORRECCIÓN: Usar el método refreshToken del servicio (que ya existe)
          const newTokenData = await this.refreshToken(refreshToken);
          return {
            authenticated: true,
            accessToken: newTokenData.access_token,
            refreshToken: refreshToken
          };
        } catch (refreshError: unknown) {
          if (refreshError instanceof Error) {
            console.log('Refresh token failed:', refreshError.message);
          }
        }
      }

      return { 
        authenticated: false,
        accessToken: null,
        refreshToken: null 
      };
    } catch (error: unknown) {
      console.error('Check auth error:', error);
      throw new InternalServerErrorException('Authentication check failed');
    }
  }

  private async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing Spotify client credentials');
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://accounts.spotify.com/api/token',
          params.toString(),
          {
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
      );

      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to refresh token: ${error.message}`);
      }
      throw new Error('Failed to refresh token: Unknown error');
    }
  }
  
@Post('play')
async play(
  @Body() playDto: PlayDto, // Puede estar vacío o tener solo device_id para reanudar
  @Req() req: Request,
  @Headers('authorization') authHeader: string
) {
  try {
    const token = authHeader?.replace('Bearer ', '') || req.cookies.access_token;
    if (!token) {
      throw new BadRequestException('Access token required');
    }

    this.spotifyService.setAccessToken(token);

    // Validación: Se requiere device_id
    if (!playDto.device_id) {
       throw new BadRequestException('Missing required parameter: device_id');
    }

    // Validación modificada:
    // Si NO se proporcionan ni 'uris' ni 'context_uri', es una solicitud de reanudar.
    // Si se proporcionan, se reproduce lo indicado.
    if (!playDto.uris && !playDto.context_uri) {
      // Caso de reanudar: solo se pasa el device_id
      // El servicio debe manejar esto correctamente
      console.log('Resuming playback on device:', playDto.device_id);
    } else {
      // Caso de reproducir algo nuevo: se requiere uris o context_uri
      if (!playDto.uris && !playDto.context_uri) {
           throw new BadRequestException('Either "uris" array or "context_uri" string must be provided to start new playback.');
      }
      // La lógica de validación principal para uris/context_uri ahora está en el servicio
      // Pero puedes agregar validaciones adicionales aquí si es necesario
    }

    // Pasar el DTO completo al servicio, incluso si está "vacío" (solo con device_id)
    await this.spotifyService.playTrack(playDto, playDto.device_id);
    return {
      success: true,
      message: playDto.uris || playDto.context_uri ? 'Reproduciendo' : 'Reanudando'
    };
  } catch (error) {
    console.error('Play endpoint error:', error);
    if (error instanceof BadRequestException) {
       // Relanzar errores de validación del controlador
       throw error;
    }
    if (error instanceof Error) {
      // Manejar errores del servicio
      throw new InternalServerErrorException(
        error.message || 'Failed to play/resume track'
      );
    }
    throw new InternalServerErrorException('Failed to play/resume track');
  }
}

  @Post('pause')
  async pause(@Req() req: Request) {
    try {
      const token = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new BadRequestException('Access token required');
      }

      this.spotifyService.setAccessToken(token);
      await this.spotifyService.pauseTrack();
      
      return { 
        success: true,
        message: 'Canción pausada' 
      };
    } catch (error) {
      console.error('Pause error:', error);
      throw new InternalServerErrorException('Failed to pause track');
    }
  }

  @Get('current-track')
  async getCurrentTrack(@Req() req: Request) {
    try {
      const token = req.cookies.access_token || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        throw new BadRequestException('Access token required');
      }

      this.spotifyService.setAccessToken(token);
      return await this.spotifyService.getCurrentTrack();
    } catch (error) {
      console.error('Current track error:', error);
      throw new InternalServerErrorException('Failed to get current track');
    }
  }

  @Post('next-track')
  async nextTrack(@Body() body: { device_id: string }, @Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('Access token required');
    if (!body.device_id) throw new Error('Missing device_id');

    this.spotifyService.setAccessToken(token);
    await this.spotifyService.nextTrack(body.device_id);
    return { success: true, message: 'Next track played' };
  }

  @Post('previous-track')
  async previousTrack(@Body() body: { device_id: string }, @Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('Access token required');
    if (!body.device_id) throw new Error('Missing device_id');

    this.spotifyService.setAccessToken(token);
    await this.spotifyService.previousTrack(body.device_id);
    return { success: true, message: 'Previous track played' };
  }

@Put('seek')
async seek(
  // Usar @Body() para obtener los datos del cuerpo de la solicitud
  @Body() seekDto: SeekDto, 
  @Req() req: Request,
  @Headers('authorization') authHeader: string
) {
  try {
    const token = authHeader?.replace('Bearer ', '') || req.cookies.access_token;
    if (!token) {
      throw new BadRequestException('Access token required');
    }
    this.spotifyService.setAccessToken(token);

    // Validar datos del cuerpo
    if (seekDto.position_ms === undefined || seekDto.device_id === undefined) {
      throw new BadRequestException('position_ms and device_id are required in the request body');
    }

    const { position_ms, device_id } = seekDto;

    await this.spotifyService.seekTrack(position_ms, device_id);
    return { message: 'Playback position updated' };
  } catch (error) {
    console.error('Seek endpoint error:', error);
    if (error instanceof BadRequestException) {
      throw error;
    }
    if (error instanceof Error) {
      throw new InternalServerErrorException(`Seek failed: ${error.message}`);
    }
    throw new InternalServerErrorException('Seek failed');
  }
}

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('limit') limit: number = 900,
    @Req() req: Request,
    @Headers('authorization') authHeader: string
  ) {
    try {
      const token = authHeader?.replace('Bearer ', '') || req.cookies.access_token;
      if (!token) {
        throw new BadRequestException('Access token required');
      }

      // Establecer el token en el servicio
      this.spotifyService.setAccessToken(token);

      if (!query || query.trim().length === 0) {
        throw new BadRequestException('Search query is required');
      }

      return this.spotifyService.searchAll(query, limit);
    } catch (error) {
      console.error('Search endpoint error:', error);
      if (error instanceof BadRequestException) {
        throw error; // Relanzar errores de validación
      }
      if (error instanceof Error) {
        throw new InternalServerErrorException(`Search failed: ${error.message}`);
      }
      throw new InternalServerErrorException('Search failed');
    }
  }// adada

  @Get('artist/:id/top-tracks')
async getArtistTopTracks(@Param('id') id: string, @Req() req: Request) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new BadRequestException('Access token required');

  this.spotifyService.setAccessToken(token);

  try {
    const data = await this.spotifyService.getArtistTopTracks(id);
    return data;
  } catch (error) {
    console.error('Error fetching artist top tracks:', error);
    throw new InternalServerErrorException('Failed to fetch artist top tracks');
  }
}

@Get('album/:id/tracks')
async getAlbumTracks(@Param('id') id: string, @Req() req: Request) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new BadRequestException('Access token required');

  this.spotifyService.setAccessToken(token);

  try {
    const data = await this.spotifyService.getAlbumTracks(id);
    return data;
  } catch (error) {
    console.error('Error fetching album tracks:', error);
    throw new InternalServerErrorException('Failed to fetch album tracks');
  }
}

@Get('playlist/:id/tracks')
async getPlaylistTracks(@Param('id') id: string, @Req() req: Request) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new BadRequestException('Access token required');

  this.spotifyService.setAccessToken(token);

  try {
    const data = await this.spotifyService.getPlaylistTracks(id);
    return data;
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    throw new InternalServerErrorException('Failed to fetch playlist tracks');
  }
} //adada

@Get('artist/:id/albums')
async getArtistAlbums(@Param('id') id: string, @Req() req: Request) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new BadRequestException('Access token required');

  this.spotifyService.setAccessToken(token);

  try {
    const data = await this.spotifyService.getArtistAlbums(id);
    return data;
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    throw new InternalServerErrorException('Failed to fetch artist albums');
  }
}
}
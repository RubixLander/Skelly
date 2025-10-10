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
      
      // Guardamos tokens en la instancia del servicio (para que el backend pueda refrescar)
      // Esto es útil para desarrollo y para que el backend haga refresh en nombre del usuario.
      // En producción multiusuario deberías guardar estos tokens por usuario en BD.
      this.spotifyService.setAccessToken(tokenData.access_token, tokenData.refresh_token, tokenData.expires_in);

      // Envía tokens al frontend también (frontend puede guardarlos en localStorage)
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
      // Preferimos cookies o header Authorization
      const accessToken = req.cookies?.access_token || req.headers.authorization?.replace('Bearer ', '');
      // Si el frontend guarda refresh token y lo envía en cookie
      const refreshToken = req.cookies?.refresh_token || (req.headers['x-refresh-token'] as string) || null;

      const result = await this.spotifyService.isAuthenticated(accessToken, refreshToken || undefined);
      return {
        authenticated: result.authenticated,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      };
    } catch (error: unknown) {
      console.error('Check auth error:', error);
      throw new InternalServerErrorException('Authentication check failed');
    }
  }

  @Post('play')
  async play(
    @Body() playDto: PlayDto,
    @Req() req: Request,
    @Headers('authorization') authHeader: string
  ) {
    try {
      // Sacar token del header o cookie
      const token = authHeader?.replace('Bearer ', '') || req.cookies?.access_token;
      const refresh = req.cookies?.refresh_token;

      if (!token) {
        throw new BadRequestException('Access token required');
      }

      // Seteamos token en el servicio (y opcionalmente refresh si viene)
      this.spotifyService.setAccessToken(token, refresh);

      if (!playDto.device_id) {
        throw new BadRequestException('Missing required parameter: device_id');
      }

      await this.spotifyService.playTrack(playDto, playDto.device_id);
      return {
        success: true,
        message: playDto.uris || playDto.context_uri ? 'Reproduciendo' : 'Reanudando'
      };
    } catch (error) {
      console.error('Play endpoint error:', error);
      if (error instanceof BadRequestException) throw error;
      if (error instanceof Error) throw new InternalServerErrorException(error.message || 'Failed to play/resume track');
      throw new InternalServerErrorException('Failed to play/resume track');
    }
  }

  @Post('pause')
  async pause(@Req() req: Request) {
    try {
      const token = req.cookies?.access_token || req.headers.authorization?.replace('Bearer ', '');
      const refresh = req.cookies?.refresh_token;
      if (!token) {
        throw new BadRequestException('Access token required');
      }
      this.spotifyService.setAccessToken(token, refresh);
      await this.spotifyService.pauseTrack();
      return { success: true, message: 'Canción pausada' };
    } catch (error) {
      console.error('Pause error:', error);
      throw new InternalServerErrorException('Failed to pause track');
    }
  }

  @Get('current-track')
  async getCurrentTrack(@Req() req: Request) {
    try {
      const token = req.cookies?.access_token || req.headers.authorization?.replace('Bearer ', '');
      const refresh = req.cookies?.refresh_token;
      if (!token) {
        throw new BadRequestException('Access token required');
      }
      this.spotifyService.setAccessToken(token, refresh);
      return await this.spotifyService.getCurrentTrack();
    } catch (error) {
      console.error('Current track error:', error);
      throw new InternalServerErrorException('Failed to get current track');
    }
  }

  @Post('next-track')
  async nextTrack(@Body() body: { device_id: string }, @Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.access_token;
    const refresh = req.cookies?.refresh_token;
    if (!token) throw new Error('Access token required');
    if (!body.device_id) throw new Error('Missing device_id');

    this.spotifyService.setAccessToken(token, refresh);
    await this.spotifyService.nextTrack(body.device_id);
    return { success: true, message: 'Next track played' };
  }

  @Post('previous-track')
  async previousTrack(@Body() body: { device_id: string }, @Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.access_token;
    const refresh = req.cookies?.refresh_token;
    if (!token) throw new Error('Access token required');
    if (!body.device_id) throw new Error('Missing device_id');

    this.spotifyService.setAccessToken(token, refresh);
    await this.spotifyService.previousTrack(body.device_id);
    return { success: true, message: 'Previous track played' };
  }

  @Put('seek')
  async seek(
    @Body() seekDto: SeekDto, 
    @Req() req: Request,
    @Headers('authorization') authHeader: string
  ) {
    try {
      const token = authHeader?.replace('Bearer ', '') || req.cookies?.access_token;
      const refresh = req.cookies?.refresh_token;
      if (!token) throw new BadRequestException('Access token required');
      this.spotifyService.setAccessToken(token, refresh);

      if (seekDto.position_ms === undefined || seekDto.device_id === undefined) {
        throw new BadRequestException('position_ms and device_id are required in the request body');
      }

      await this.spotifyService.seekTrack(seekDto.position_ms, seekDto.device_id);
      return { message: 'Playback position updated' };
    } catch (error) {
      console.error('Seek endpoint error:', error);
      if (error instanceof BadRequestException) throw error;
      if (error instanceof Error) throw new InternalServerErrorException(`Seek failed: ${error.message}`);
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
      const token = authHeader?.replace('Bearer ', '') || req.cookies?.access_token;
      const refresh = req.cookies?.refresh_token;
      if (token) this.spotifyService.setAccessToken(token, refresh);

      if (!query || query.trim().length === 0) {
        throw new BadRequestException('Search query is required');
      }

      return this.spotifyService.searchAll(query, limit);
    } catch (error) {
      console.error('Search endpoint error:', error);
      if (error instanceof BadRequestException) throw error;
      if (error instanceof Error) throw new InternalServerErrorException(`Search failed: ${error.message}`);
      throw new InternalServerErrorException('Search failed');
    }
  }

  @Get('artist/:id/top-tracks')
  async getArtistTopTracks(@Param('id') id: string, @Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.access_token;
    const refresh = req.cookies?.refresh_token;
    if (token) this.spotifyService.setAccessToken(token, refresh);

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
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.access_token;
    const refresh = req.cookies?.refresh_token;
    if (token) this.spotifyService.setAccessToken(token, refresh);

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
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.access_token;
    const refresh = req.cookies?.refresh_token;
    if (token) this.spotifyService.setAccessToken(token, refresh);

    try {
      const data = await this.spotifyService.getPlaylistTracks(id);
      return data;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      throw new InternalServerErrorException('Failed to fetch playlist tracks');
    }
  }

  @Get('artist/:id/albums')
  async getArtistAlbums(@Param('id') id: string, @Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.access_token;
    const refresh = req.cookies?.refresh_token;
    if (token) this.spotifyService.setAccessToken(token, refresh);

    try {
      const data = await this.spotifyService.getArtistAlbums(id);
      return data;
    } catch (error) {
      console.error('Error fetching artist albums:', error);
      throw new InternalServerErrorException('Failed to fetch artist albums');
    }
  }

  @Get('track/:id')
  async getTrack(@Param('id') id: string, @Headers('authorization') authHeader: string, @Req() req: Request) {
    const token = authHeader?.replace('Bearer ', '') || req.cookies?.access_token;
    const refresh = req.cookies?.refresh_token;
    if (token) this.spotifyService.setAccessToken(token, refresh);
    // token param se mantiene por compatibilidad con la firma
    return this.spotifyService.getTrackById(id, token);
  }

  @Get('album/:id')
  async getAlbum(@Param('id') id: string, @Headers('authorization') authHeader: string, @Req() req: Request) {
    const token = authHeader?.replace('Bearer ', '') || req.cookies?.access_token;
    const refresh = req.cookies?.refresh_token;
    if (token) this.spotifyService.setAccessToken(token, refresh);
    return this.spotifyService.getAlbumDetails(id);
  }

  @Get('playlist/:id')
  async getPlaylist(@Param('id') id: string, @Headers('authorization') authHeader: string, @Req() req: Request) {
    const token = authHeader?.replace('Bearer ', '') || req.cookies?.access_token;
    const refresh = req.cookies?.refresh_token;
    if (token) this.spotifyService.setAccessToken(token, refresh);
    return this.spotifyService.getPlaylistDetails(id);
  }

  @Get('artist/:id')
  async getArtist(@Param('id') id: string, @Headers('authorization') authHeader: string, @Req() req: Request) {
    const token = authHeader?.replace('Bearer ', '') || req.cookies?.access_token;
    const refresh = req.cookies?.refresh_token;
    if (token) this.spotifyService.setAccessToken(token, refresh);
    return this.spotifyService.getArtistDetails(id);
  }
}

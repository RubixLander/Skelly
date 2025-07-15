import { Controller, Get, Post, Body, Query, Req, Res, Headers } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { PlayDto } from './dto/play.dto';
import { Request, Response } from 'express';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

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
    @Body() playDto: PlayDto, 
    @Req() req: Request,
    @Headers('authorization') authHeader: string
  ) {
    try {
      const token = authHeader?.replace('Bearer ', '') || req.cookies.access_token;
      if (!token) {
        throw new BadRequestException('Access token required');
      }

      if (!playDto.uri || !playDto.device_id) {
        throw new BadRequestException('Missing required parameters');
      }

      this.spotifyService.setAccessToken(token);
      await this.spotifyService.playTrack(playDto.uri, playDto.device_id);
      
      return { 
        success: true,
        message: 'Reproduciendo canción' 
      };
    } catch (error) {
      console.error('Play error:', error);
      
      if (error instanceof AxiosError && error.response) {
        throw new InternalServerErrorException(
          error.response.data?.error?.message || 'Spotify API error'
        );
      }
      
      throw new InternalServerErrorException('Failed to play track');
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
}
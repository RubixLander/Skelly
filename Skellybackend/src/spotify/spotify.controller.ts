import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SpotifyService } from './spotify.service';
import { PlayDto } from './dto/play.dto';
import { Res } from '@nestjs/common';
import { Response } from 'express';
import { BadRequestException } from '@nestjs/common';

@Controller('spotify') // Prefijo base de la ruta: /spotify
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  // Endpoint POST /spotify/login
  // Devuelve la URL que el frontend debe abrir para que el usuario inicie sesión en Spotify
  @Post('login')
  login() {
    return this.spotifyService.getAuthUrl();
  }

    // Endpoint GET /spotify/callback?code=...
  @Get('callback')
  async callback(@Query('code') code: string, @Res({ passthrough: true }) res: Response) {
    const tokenData = await this.spotifyService.getAccessToken(code);

    // Guardar el access token como cookie segura (opcionalmente con httpOnly)
    res.cookie('access_token', tokenData.access_token, {
      httpOnly: true,
      secure: true, // Solo HTTPS
      sameSite: 'lax',
      maxAge: 3600000, // 1 hora
    });

    return { message: 'Autenticado con éxito (cookie creada)' };
  }

  @Post('play')
  async play(@Body() playDto: PlayDto) {
    await this.spotifyService.playTrack(playDto.uri);
    return { message: 'Reproduciendo canción' };
  }
  
  // Endpoint POST /spotify/pause
  // Pausa la reproducción actual
  @Post('pause')
  async pause() {
    await this.spotifyService.pauseTrack();
    return { message: 'Canción pausada' };
  }

  // Endpoint GET /spotify/current-track
  // Devuelve información de la canción que está sonando actualmente
  @Get('current-track')
  async getCurrentTrack() {
    return await this.spotifyService.getCurrentTrack();
  }

  @Post('refresh-token')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Faltan variables de entorno para la autenticación de Spotify');
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token',  {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error al refrescar el token: ${data.error_description || data.error}`);
    }

    return data; // Nuevo access_token
  }
  
  @Get('search')
  async search(
    @Query('query') query: string,
    @Query('limit') limit: number = 5,
  ) {
    if (!query) {
      throw new BadRequestException('El parámetro "query" es obligatorio.');
    }
    return this.spotifyService.searchAll(query, limit);
  }
}